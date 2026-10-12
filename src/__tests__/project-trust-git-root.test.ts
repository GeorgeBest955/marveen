// #1904: Claude Code honours a project's .claude/settings.json permissions.allow
// only when the GIT ROOT is trusted, not the cwd. stampProjectTrustForDir used to
// stamp only agents/<name> (and its realpath), so on a git-checkout install a
// strict-profile (dontAsk) agent lost its whole allow-list.
//
// What this pins:
// - an agent dir inside a git repo: the repo's toplevel is stamped too (red
//   before the fix), next to the agent dir;
// - an agent dir outside any repo: no toplevel, nothing extra, no throw;
// - toplevel == agent dir: one entry, no duplicate key;
// - gitToplevelFor falls back to null on any failure, and an inherited GIT_DIR
//   cannot point it at another repo;
// - the launch call site lets the default toplevel lookup run (it passes no
//   third argument), so the stamp reaches the git root on every start.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { gitToplevelFor, stampProjectTrustForDir } from '../web/agent-process.js'

const AGENT_PROCESS = readFileSync(join(__dirname, '..', 'web', 'agent-process.ts'), 'utf-8')

let work: string
let dotClaude: string
const gitInit = (dir: string) => execFileSync('git', ['init', '-q', dir], { stdio: 'ignore' })
const projects = () => JSON.parse(readFileSync(dotClaude, 'utf-8')).projects as Record<string, Record<string, unknown>>
const trusted = (key: string) => projects()[key]?.hasTrustDialogAccepted === true && projects()[key]?.hasCompletedProjectOnboarding === true

beforeEach(() => {
  work = realpathSync(mkdtempSync(join(tmpdir(), 'trust-1904-')))
  dotClaude = join(work, 'config', '.claude.json')
  mkdirSync(join(work, 'config'), { recursive: true })
})
afterEach(() => {
  delete process.env.GIT_DIR
  rmSync(work, { recursive: true, force: true })
})

describe('stampProjectTrustForDir: the git root (#1904)', () => {
  it('an agent dir in a subfolder of a git checkout: the checkout root is trusted too', () => {
    const root = join(work, 'marveen')
    const agent = join(root, 'agents', 'webdev')
    mkdirSync(agent, { recursive: true })
    gitInit(root)
    expect(stampProjectTrustForDir(dotClaude, agent)).toBe(true)
    expect(trusted(agent)).toBe(true)
    expect(trusted(root)).toBe(true)
    expect(Object.keys(projects()).sort()).toEqual([agent, root].sort())
  })

  it('outside any git repo: only the agent dir, no throw', () => {
    const agent = join(work, 'plain', 'agents', 'webdev')
    mkdirSync(agent, { recursive: true })
    expect(gitToplevelFor(agent)).toBeNull()
    expect(stampProjectTrustForDir(dotClaude, agent)).toBe(true)
    expect(Object.keys(projects())).toEqual([agent])
  })

  it('the agent dir IS the toplevel: one key, not two', () => {
    const agent = join(work, 'solo')
    mkdirSync(agent, { recursive: true })
    gitInit(agent)
    expect(gitToplevelFor(agent)).toBe(agent)
    stampProjectTrustForDir(dotClaude, agent)
    expect(Object.keys(projects())).toEqual([agent])
  })

  it('already stamped, root included: a second launch writes nothing', () => {
    const root = join(work, 'marveen')
    const agent = join(root, 'agents', 'webdev')
    mkdirSync(agent, { recursive: true })
    gitInit(root)
    expect(stampProjectTrustForDir(dotClaude, agent)).toBe(true)
    expect(stampProjectTrustForDir(dotClaude, agent)).toBe(false)
  })

  it('an explicit null toplevel stamps what it stamped before (the fallback path)', () => {
    const root = join(work, 'marveen')
    const agent = join(root, 'agents', 'webdev')
    mkdirSync(agent, { recursive: true })
    gitInit(root)
    stampProjectTrustForDir(dotClaude, agent, null)
    expect(Object.keys(projects())).toEqual([agent])
  })
})

describe('gitToplevelFor (#1904)', () => {
  it('a failing, empty or blank git answer is null; the answer is trimmed', () => {
    expect(gitToplevelFor('/x', () => { throw new Error('ENOENT git') })).toBeNull()
    expect(gitToplevelFor('/x', () => '')).toBeNull()
    expect(gitToplevelFor('/x', () => '  \n')).toBeNull()
    expect(gitToplevelFor('/x', () => '/home/u/marveen\n')).toBe('/home/u/marveen')
  })

  it('an inherited GIT_DIR does not point it at another repo', () => {
    const root = join(work, 'marveen')
    const agent = join(root, 'agents', 'webdev')
    const other = join(work, 'other')
    mkdirSync(agent, { recursive: true })
    mkdirSync(other, { recursive: true })
    gitInit(root)
    gitInit(other)
    process.env.GIT_DIR = join(other, '.git')
    expect(gitToplevelFor(agent)).toBe(root)
  })
})

describe('the launch call site (#1904)', () => {
  it('startAgentProcess passes no toplevel override, so the git-root lookup runs on every start', () => {
    const call = "stampProjectTrustForDir(\n      claudeConfigDir ? join(claudeConfigDir, '.claude.json') : join(homedir(), '.claude.json'),\n      dir,\n    )"
    expect(AGENT_PROCESS).toContain(call)
    // The default is the lookup itself, not a constant.
    expect(AGENT_PROCESS).toContain('toplevel: string | null = gitToplevelFor(projectDir),')
  })
})
