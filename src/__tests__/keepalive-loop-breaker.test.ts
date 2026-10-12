import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  decideKeepaliveLoop, releaseKeepaliveLoop, keepaliveProducerAdvanced, keepaliveProducerRemedy,
  KEEPALIVE_LOOP_INITIAL, KEEPALIVE_USELESS_RESPAWN_LIMIT, type KeepaliveLoopState,
} from '../web/channel-monitor.js'

// KEEPALIVELOOP923. 2026-09-23: the keepalive producer hung, the file stayed
// stale with a LIVE poller, and the keepalive path respawned a healthy main
// session 28 times in one morning. A respawn cannot fix a dead producer, so
// after KEEPALIVE_USELESS_RESPAWN_LIMIT useless respawns the monitor must hold
// and alert once.
//
// ISSUE1891 (b): "useless" and "released" are judged by the PRODUCER's own
// stamp (store/.channel-keepalive-probe), never by store/.channel-keepalive.
// channels.sh touches the keepalive on every (re)spawn and inbound traffic warms
// it, so the old breaker read each respawn's own touch as "the producer is
// back" and never held: on a Mac whose probe never ran (no GUI login) that was a
// respawn of a healthy session every 45 minutes. The functions below take no
// keepalive mtime at all; the call site is pinned to pass the producer stamp.

const ALIVE = { pollerAlive: true }

// One stale tick at the call site: release first (as checkMainKeepaliveStaleness
// does before its early returns), then the verdict.
function staleTick(state: KeepaliveLoopState, obs: { pollerAlive: boolean; producerMtimeMs: number | null }) {
  const rel = releaseKeepaliveLoop(state, obs.producerMtimeMs)
  const d = decideKeepaliveLoop(rel.state, obs)
  return { state: d.state, decision: d.decision, released: rel.released }
}

describe('decideKeepaliveLoop: judged by the producer stamp', () => {
  it('respawns on the first stale tick (no earlier respawn to judge) and records the producer as the baseline', () => {
    const r = decideKeepaliveLoop(KEEPALIVE_LOOP_INITIAL, { ...ALIVE, producerMtimeMs: 500 })
    expect(r.decision).toBe('respawn')
    expect(r.state).toEqual({ uselessRespawns: 0, producerAtLastRespawn: 500, respawned: true, alerted: false })
  })

  it('#1891: the probe never runs (no stamp), each respawn touches the keepalive -- two respawns, one alert, then silence', () => {
    let state = { ...KEEPALIVE_LOOP_INITIAL }
    const decisions: string[] = []
    for (let tick = 0; tick < 8; tick++) {
      // channels.sh touches store/.channel-keepalive here on every respawn, and
      // inbound traffic warms it; neither reaches these functions.
      const r = staleTick(state, { ...ALIVE, producerMtimeMs: null })
      decisions.push(r.decision)
      expect(r.released).toBe(false)
      state = r.state
    }
    expect(decisions).toEqual(['respawn', 'respawn', 'hold-and-alert', 'hold', 'hold', 'hold', 'hold', 'hold'])
  })

  it('2026-09-23: a hung producer (stamp frozen) -- the same two respawns, one alert, then silence', () => {
    let state = { ...KEEPALIVE_LOOP_INITIAL }
    const decisions: string[] = []
    for (let tick = 0; tick < 5; tick++) {
      const r = staleTick(state, { ...ALIVE, producerMtimeMs: 1000 })
      decisions.push(r.decision)
      state = r.state
    }
    expect(decisions).toEqual(['respawn', 'respawn', 'hold-and-alert', 'hold', 'hold'])
  })

  it('a producer that ran between respawns keeps the count at zero', () => {
    let state = { ...KEEPALIVE_LOOP_INITIAL }
    for (const producer of [1000, 2000, 3000, 4000]) {
      const r = staleTick(state, { ...ALIVE, producerMtimeMs: producer })
      expect(r.decision).toBe('respawn')
      expect(r.state.uselessRespawns).toBe(0)
      state = r.state
    }
  })

  it('a stamp that appears after a respawn without one counts as the producer starting', () => {
    const first = decideKeepaliveLoop(KEEPALIVE_LOOP_INITIAL, { ...ALIVE, producerMtimeMs: null }).state
    expect(keepaliveProducerAdvanced(first, null)).toBe(false)
    expect(keepaliveProducerAdvanced(first, 1000)).toBe(true)
  })

  it('never holds back when the poller is dead (real deafness), even while alerted', () => {
    const held: KeepaliveLoopState = { uselessRespawns: 5, producerAtLastRespawn: 1000, respawned: true, alerted: true }
    const r = decideKeepaliveLoop(held, { pollerAlive: false, producerMtimeMs: 1000 })
    expect(r.decision).toBe('respawn')
    expect(r.state.uselessRespawns).toBe(0)
  })
})

describe('releaseKeepaliveLoop: only the producer releases a held breaker', () => {
  const held: KeepaliveLoopState = { uselessRespawns: 2, producerAtLastRespawn: 1000, respawned: true, alerted: true }

  it('the producer stamp moved since the last respawn: released, once, back to the initial state', () => {
    const r = releaseKeepaliveLoop(held, 1180)
    expect(r).toEqual({ state: KEEPALIVE_LOOP_INITIAL, released: true })
    expect(releaseKeepaliveLoop(r.state, 1360).released).toBe(false) // not alerted any more: nothing to release
  })

  it('the stamp did not move (or is missing): stays held, whatever the keepalive file did', () => {
    expect(releaseKeepaliveLoop(held, 1000)).toEqual({ state: held, released: false })
    expect(releaseKeepaliveLoop(held, null)).toEqual({ state: held, released: false })
  })

  it('a held breaker over hours of channels.sh touches and inbound traffic says nothing more, then releases on the first probe run', () => {
    let state: KeepaliveLoopState = { ...held }
    const events: string[] = []
    for (let tick = 0; tick < 12; tick++) {
      const producer = tick < 10 ? 1000 : 1000 + tick * 180
      const r = staleTick(state, { ...ALIVE, producerMtimeMs: producer })
      events.push(r.released ? 'released' : r.decision)
      state = r.state
    }
    expect(events).toEqual([...Array(10).fill('hold'), 'released', 'respawn'])
  })
})

describe('keepaliveProducerRemedy: the alert names the job and the command', () => {
  it('macOS: the launchd job, bootstrap + kickstart in gui/<uid>', () => {
    expect(keepaliveProducerRemedy('darwin', 'hex', 501, '/Users/h')).toEqual({
      job: 'com.hex.channel-keepalive-probe (launchd)',
      command: 'launchctl bootstrap gui/501 "/Users/h/Library/LaunchAgents/com.hex.channel-keepalive-probe.plist" 2>/dev/null; launchctl kickstart gui/501/com.hex.channel-keepalive-probe',
    })
  })
  it('Linux: the user timer, enable --now', () => {
    expect(keepaliveProducerRemedy('linux', 'hex', 1000, '/home/h')).toEqual({
      job: 'hex-channel-keepalive-probe.timer (systemd --user)',
      command: 'systemctl --user enable --now hex-channel-keepalive-probe.timer',
    })
  })
})

describe('the call site (checkMainKeepaliveStaleness) is bound to the producer stamp', () => {
  const src = readFileSync(join(__dirname, '..', 'web', 'channel-monitor.ts'), 'utf-8')
  const start = src.indexOf('function checkMainKeepaliveStaleness')
  const body = src.slice(start, src.indexOf('\nexport function sendAlert', start))

  it('reads store/.channel-keepalive-probe, and hands only that to the breaker', () => {
    expect(src).toContain("const KEEPALIVE_PRODUCER_STAMP = join(PROJECT_ROOT, 'store', '.channel-keepalive-probe')")
    expect(body).toContain('const producerMtimeMs = readProducerStampMtime()')
    expect(body).toContain('releaseKeepaliveLoop(keepaliveLoop, producerMtimeMs)')
    expect(body).toContain('decideKeepaliveLoop(keepaliveLoop, { pollerAlive, producerMtimeMs })')
    expect(body).not.toMatch(/keepaliveMtime/)
  })

  it('checks the release before the live-poller shortcut can return', () => {
    const rel = body.indexOf('releaseKeepaliveLoop(')
    const shortcut = body.indexOf('hasChannelPluginAlive(')
    expect(rel).toBeGreaterThan(0)
    expect(shortcut).toBeGreaterThan(rel)
  })

  it('the hold alert names the job and the fix; the release is said once', () => {
    expect(body).toContain('keepaliveProducerRemedy(process.platform, SERVICE_ID,')
    expect(body).toMatch(/A jelző: \$\{fix\.job\}\. Indítsd el: \$\{fix\.command\}/)
    expect(body).toMatch(/if \(rel\.released\) \{[\s\S]{0,200}sendAlert\(/)
  })
})

describe('scripts/channel-keepalive-probe.sh stamps every run, whatever it finds', () => {
  // The real script, copied into a throwaway install (it derives its store from its
  // own location), with PATH stubs; nothing here reaches this machine's tmux or launchd.
  function install(tmuxHasSession: boolean | null): { dir: string; run: () => void } {
    const dir = mkdtempSync(join(tmpdir(), 'ka-probe-'))
    mkdirSync(join(dir, 'scripts')); mkdirSync(join(dir, 'store')); mkdirSync(join(dir, 'bin'))
    copyFileSync(join(__dirname, '..', '..', 'scripts', 'channel-keepalive-probe.sh'), join(dir, 'scripts', 'channel-keepalive-probe.sh'))
    if (tmuxHasSession !== null) {
      writeFileSync(join(dir, 'bin', 'tmux'), `#!/bin/sh\n[ "$1" = has-session ] && exit ${tmuxHasSession ? 0 : 1}\nexit 1\n`)
      chmodSync(join(dir, 'bin', 'tmux'), 0o755)
    }
    const run = () => execFileSync('/bin/bash', [join(dir, 'scripts', 'channel-keepalive-probe.sh')], {
      env: { PATH: `${join(dir, 'bin')}:/usr/bin:/bin`, HOME: dir, PROBE_TIMEOUT_S: '20' }, stdio: 'pipe',
    })
    return { dir, run }
  }

  it.each([
    ['tmux missing', null],
    ['the session absent', false],
  ] as const)('%s: the probe exits early, and its stamp is still written', (_n, tmux) => {
    const { dir, run } = install(tmux)
    try {
      run()
      const stamp = join(dir, 'store', '.channel-keepalive-probe')
      expect(existsSync(stamp)).toBe(true)
      expect(readFileSync(stamp, 'utf-8').trim()).toMatch(/^\d{10}$/)
      expect(existsSync(join(dir, 'store', '.channel-keepalive'))).toBe(false) // no producer touch without a session
      // A second run moves the stamp (set it back first: a 1 s mtime resolution would hide the move).
      utimesSync(stamp, new Date(1_000_000_000), new Date(1_000_000_000))
      run()
      expect(statSync(stamp).mtimeMs).toBeGreaterThan(1_000_000_000_000)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
