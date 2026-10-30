# Marveen frissítés-elemzés: v1.44.0 -> v1.45.0

- Upstream: https://github.com/Szotasz/marveen
- Tartomány: `v1.44.0` (annotált tag objektum `3f7b929d`, commit `24ba5862`) -> `v1.45.0` (annotált tag objektum `8ceb334a`, commit `017bc9d6`)
- Commitok száma: `git rev-list --count v1.44.0..v1.45.0` = **193** (192 változás + a `017bc9d6` kiadási commit)
- Diff méret: `git diff --stat v1.44.0 v1.45.0` = 572 fájl, +78759 / -2914 sor
- Ellenőrzés: mindkét tag létezik az upstreamen (`git ls-remote upstream refs/tags/v1.44.0 refs/tags/v1.45.0`), a hash-ek egyeznek a feladatban megadottakkal.

**Fontos korlát.** Ez a jelentés a `GeorgeBest955/marveen` klónjában készült. Ennek a `main` ága `v1.43.0`-n áll (`f44edf07`, `git describe` = `v1.43.0`, a `v1.44.0` nem őse), és **nincs** benne a feladatban felsorolt 12 helyi, commitolatlan módosítás. A helyi változások tartalma ezért itt **NOT FOUND**: a 3. pont konfliktustérképe csak az upstream oldalt méri (mit módosít a `v1.44.0..v1.45.0` a 12 fájlban), a tényleges átfedést a telepítés saját `git diff`-jével kell összevetni (lásd 6. pont).

---

## 1. Összefoglaló: a 193 commit témák szerint

A besorolás a commit tárgysora (scope) alapján készült; minden commit pontosan egy témába került, az összeg 193.

| # | Téma | Commit | Reprezentatív commitok |
|---|------|-------:|------------------------|
| 1 | Kimenő levél- és szövegkapuk (mail-gates, email-approval-gate, copy-gate, recipient-ledger, mail-senders) | 13 | `0cf4acab`, `336bfadc`, `63897729` |
| 2 | Jogosultság, gazda-hitelesítés, jóváhagyások, skill-karantén, fleet-freeze, második bíráló, feladói szerep-kapu | 19 | `81b714d5`, `964acff3`, `bb9d7a37` |
| 3 | Egress és külső tartalom (egress-gate IPv6, `BASH_EGRESS_HOST_ALLOW`, bash-sandbox, yt-ingest, WebSearch/WebFetch keretezés, injekció-gyanú, strict-profile) | 18 | `61a6572b`, `ab414cfc`, `95d20e78` |
| 4 | Context-guard, újraindítás, pane-állapot, bevitel és `/mcp reconnect` | 23 | `402de0e1`, `62886e7d`, `21dd0d11` |
| 5 | Watchdog, felügyelet, riasztás (engedélykérés-riasztás, hook-hibák, uptime monitor, host heartbeat, doctor) | 10 | `620fc2b9`, `293ebfe2`, `339b86cd` |
| 6 | Ütemező és ütemezett feladatok (hash-registry, preCheck, reggeli napindító) | 9 | `8562ef26`, `e7500d52`, `a4545a8a` |
| 7 | Kanban, dashboard UI, beállítások, üzenetek | 14 | `b02e0afd`, `4484998c`, `ae9c53bc` |
| 8 | Csatornák: Telegram, Discord, Teams, hang, channels.sh | 17 | `af4d67ff`, `ecfc0181`, `12037f51` |
| 9 | Flotta, ügynök-identitás, fleet-import, roster, scaffold, claude-plans, connectors | 16 | `0b88d90b`, `4540f195`, `ea848e25` |
| 10 | Teljesítmény: event loop nem blokkol (tmux, git, ssh-keygen, mcp add/remove) és ezek javításai | 15 | `12b7e59a`, `95a5eb22`, `33ed05f5` |
| 11 | Telepítő, `update.sh`, migráció, tesztek, dokumentáció, kiadás | 30 | `3c80a9eb`, `ce543e42`, `017bc9d6` |
| 12 | Memória, vault, költségkeret (costops), token-használat | 9 | `603e8cac`, `9b5f8d2b`, `45ec4328` |

Megjegyzés a besoroláshoz: határesetek (pl. `80d1aae5` a 7. témában, `830fbcbd` az 5. témában, `eb32a3d8` a 4. témában, `2ea4703e` a 8. témában) a fő hatásuk szerint kerültek a helyükre.

---

## 2. Törő vagy kockázatos változások

### 2.1 Hook-parancsok a beállításfájlokban

| Commit | Fájl | Változás | Teendő egy meglévő telepítésen |
|--------|------|----------|-------------------------------|
| `e9298f2b` | `.claude/settings.json`, `templates/settings.json.template` | Új `UserPromptSubmit` hook: `python3 "$CLAUDE_PROJECT_DIR/scripts/hooks/taskstate-stub.py"` (timeout 10). | A helyi `.claude/settings.json` összefésülésekor a sort meg kell tartani; az új fájl `scripts/hooks/taskstate-stub.py` (A) jelen kell legyen. |
| `95d20e78`, `e5b4ae99` | `.claude/settings.json` | Új `PostToolUse` hook `WebSearch\|WebFetch` matcherrel: `scripts/hooks/browser-content-notice.py`. Sub-ágensekre a scaffold startup-migrációja is beírja (`injectWebSearchEnvelope`, `ensureWebSearchEnvelope` az `src/web/agent-scaffold.ts`-ben). | Összefésülés; a sub-ágensek beállításai a dashboard indításakor átíródnak. |
| `964acff3` | `.claude/settings.json`, `templates/settings.json.template`, `src/web/agent-worker.ts` | Új `PreToolUse` hook `"*"` matcherrel, első helyen: `bash "$CLAUDE_PROJECT_DIR/scripts/hooks/fleet-freeze-gate.sh"`. A worker saját settings-ébe is bekerül (`withFleetFreezeGate`). | Összefésülés; amíg `store/fleet-freeze.json` létezik, minden tool-hívás tiltva. Ellenőrizni, hogy ez a fájl nem maradt-e ott. |
| `0cf4acab`, `6404419e`, `63897729` | `.claude/settings.json` | Új, hosszú `PreToolUse` matcher (`.*send_draft.*\|.*update_draft.*\|...\|.*update[-_]shared[-_]mailbox[-_]message.*`) az `outgoing-copy-gate.py`-ra és az `email-approval-gate.py`-ra. | Összefésülés; a `src/__tests__/project-settings-hook-anchor.test.ts` pontosan ezt a listát várja. |
| `20cae069`, `61a6572b` | `templates/settings.json.template` | Taskstate hook-prompt fejléc (`X-Agent-Id`) és egress-szabályok sablonja. | A sub-ágens beállítások a dashboard indításakor újragenerálódnak; helyi kézi módosítás a sablonban felülíródhat. |

### 2.2 Új vagy változott környezeti változók és `.env` kulcsok

| Kulcs | Commit | Fájl | Alapérték / viselkedés | Teendő |
|-------|--------|------|------------------------|--------|
| `VOICE_CHANNEL_ID` | `12037f51` | `.env.example`, `src/config.ts` (commit szerint), `scripts/migrate-main-agent-id.sh` | Alapértéke `hanna`; indításkor olvasódik. | Nincs, ha a relé `hanna` néven ír. |
| `MAIN_AGENT_RECIPIENT_LEDGER` | `336bfadc` | `.env.example` | Alapból ki; `1` esetén a fő ágensre is él a címzett-ledger (`store/verified-recipients.json`). | Opcionális. |
| `SUPPORT_OWNER_CC` (változott) | `336bfadc` | `.env.example` | Mostantól csak a `.env` fájlból olvasódik, környezeti változóból nem. | Ha eddig környezeti változóként adtátok meg, át kell tenni a `.env`-be. |
| `VOICE_LENGTH_SCALE`, `VOICE_SENTENCE_SILENCE`, `VOICE_NOISE_SCALE`, `VOICE_NOISE_W_SCALE` | `e32cf5fb` | `scripts/voice/_vtools.py` | Beállítatlanul nem kerül flag a Piper parancssorba. | Opcionális. |
| `MARVEEN_TELEGRAM_REACTION`, `MARVEEN_TELEGRAM_REACTION_KEEP_AGENT`, `MARVEEN_TELEGRAM_REACTION_EMOJIS` | `af4d67ff` | `plugins/telegram-reaction`, `docs/telegram-reaction.md` | A plugin alapból ki. | Opcionális. |
| `HOST_HEARTBEAT_*` | `3a8a1429` | host heartbeat script (commit üzenet szerint) | RAM 600 MB, load 2.0/mag, 5120 MB szabad, 90% foglalt, `/`. | Opcionális. |
| `TEAMS_SERVICE_URL` | `aafc83e9` | `src/teams-send.ts` | Csak ha nincs tárolt Teams conversation-ref. | Csak Teams fő csatornán. |
| `GUARD_DRAIN_TIMEOUT` | `c1b92df6` | `scripts/guard-run.sh` (commit szerint) | Alapértéke 3 másodperc. | Nincs. |

### 2.3 Új beállításkulcsok (`src/config-registry.ts`, Settings oldal)

Mind a `v1.45.0:src/config-registry.ts`-ből olvasva:

| Kulcs | Alapérték | Commit |
|-------|-----------|--------|
| `KANBAN_DISPATCH_SKIP_AGENTS` | `''` | `ce7ac9f0` |
| `KANBAN_CLAIM_LOCK` | `'0'` | `b02e0afd` |
| `EMBED_QUERY_PREFIX`, `EMBED_DOCUMENT_PREFIX`, `EMBED_KEEP_ALIVE` | `''` | `3a7e6a06` |
| `MEMORY_RRF_FTS_WEIGHT`, `MEMORY_RRF_VECTOR_WEIGHT` | `'1'` | `3a7e6a06` |
| `VAULT_ACL_MODE` | `'audit'` | `603e8cac` |
| `BASH_EGRESS_HOST_ALLOW` | `'0'` | `61a6572b` |
| `BASH_SANDBOX_AGENTS` | `''` | `ab414cfc` |
| `PERMISSION_ALERT_MARKS` | `'15m,30m,1h,2h,8h,24h'` | `620fc2b9` |
| `YT_DLP_INGEST_ONLY` | `'0'` | `536f9308` |

Konfigfájl-formátum bővülések: `costops-config.json` új opcionális `token_prices` táblája (`9b5f8d2b`) és `enforce_agent_budgets` kulcsa (`40512e8d`, nem boolean érték configerror); `agent-config.json` új `senderRoleGate` kulcsa (`4c20eb80`); biztonsági profil `"secondReviewer": true` (`25f5fec2`); új store-fájlok: `store/vault-acl.json` (`603e8cac`), `store/egress-measure-hosts.json` (`ef615bd6`), `store/bash-sandbox-write-paths.json` (`ab414cfc`), `store/uptime-targets.json` (`339b86cd`), `store/fleet-freeze.json` (`964acff3`). Mind opcionális; régi formátum eltávolítása **NOT FOUND**.

### 2.4 Adatbázis-migrációk (`store/claudeclaw.db`)

Mind automatikusan fut a dashboard indításakor (`CREATE ... IF NOT EXISTS`, illetve `ALTER TABLE ... ADD COLUMN` próbálkozás):

| Commit | Változás |
|--------|----------|
| `0da9f431` | `ALTER TABLE kanban_cards ADD COLUMN start_date INTEGER` |
| `b02e0afd` | `kanban_cards` további oszlopai (claim lock), `ALTER TABLE kanban_cards ADD COLUMN ${col}` |
| `5b404c44` | `ALTER TABLE kanban_cards ADD COLUMN version INTEGER NOT NULL DEFAULT 0` |
| `4484998c` | `ALTER TABLE kanban_cards ADD COLUMN done_evidence TEXT` |
| `80d1aae5` | `ALTER TABLE agent_messages ADD COLUMN seen_at INTEGER` + `idx_agent_messages_unseen` index |
| `8562ef26` | `CREATE TABLE IF NOT EXISTS scheduled_task_registry` és `scheduled_task_registry_state` (backfill marker `upgrade-backfill-v1`) |
| `ae9c53bc` | `CREATE TABLE IF NOT EXISTS team_notes` + `idx_team_notes_active` |
| `45ec4328` | `CREATE TABLE IF NOT EXISTS daily_log_memory`, `idx_memories_agent_created`, `idx_memories_category_created` |

Teendő: frissítés előtt mentés a `store/claudeclaw.db`-ről. Hogy a v1.44.0 kód elindul-e a bővített sémával (visszaállás esetén): **NOT FOUND**.

### 2.5 Új függőségek és rendszercsomagok

- `package.json`: új függőség **NOT FOUND**; csak két új npm script: `hook-failures` (`293ebfe2`), `bridge-device-key` (`07c6dad0`).
- `bwrap` és `ffmpeg` (és yt-dlp venv) a `scripts/yt-ingest/yt-ingest.sh`-hoz (`bb604412`; a script `command -v bwrap ... || fail "dep=bwrap"`). Csak ha a yt-ingest-et használjátok.
- `dd3024fb`: a task-last-run a `python3` beépített `sqlite3` modulját használja, nem a `sqlite3` CLI-t (függőség csökken).
- Claude Code `>= 2.1.287` a `telegram-reaction` pluginhoz (`af4d67ff`); alatta a plugin nem töltődik be.
- `BASH_SANDBOX_AGENTS` a Claude Code macOS sandboxát használja (`ab414cfc`, `docs/bash-sandbox.md`); Linuxon működése **NOT FOUND**.

### 2.6 `update.sh`, telepítők, szolgáltatás-unitok

| Commit | Fájl | Mi változott | Teendő |
|--------|------|--------------|--------|
| `8562ef26` | `update.sh` (+212/-4 összesen), `install-linux.sh`, `install-macos.sh`, `scripts/migrate-main-agent-id.sh` | Új `sched_task_verified_ok`, `register_seeded_schedules`, `register_refreshed_schedule`, `sched_task_all_shipped`; a seedelt ütemezett feladatokat a `dist/web/schedule-registry-cli.js register` regisztrálja. Helyben módosított feladatot NEM regisztrál, hanem "Kezi atnezesre varo" listára teszi. | A frissítési napló végén nézd meg a `Kezi atnezesre varo utemezett feladatok` sort; utána `node dist/web/schedule-registry-cli.js status`. |
| `e6fc670c` | `update.sh` (`park_morning_timer`) | A reggeli 07:27 timer csak akkor parkol, ha a `reggeli-napindito` registry-ítélete `ok`. | Ellenőrizni a `FIGYELEM: ... engedelyezve marad` üzenetet. |
| `3c80a9eb` | `update.sh` (rollback ágak és finalizer) | `native_module_loads \|\| npm rebuild better-sqlite3`. | Nincs. |
| `d9366fe2` | `update.sh` (finalizer) | `_stage` jelölők és nem-végzetes `trap` TERM/HUP/INT-re. Egy futó finalizert csak SIGKILL állít le. | Tudni róla. |
| `8562ef26`, `a4545a8a` | `install-linux.sh` (+16/-1) | `INSTALL_SCHED_REGISTER` gyűjtés és regisztráció; komment: a `<id>-morning.timer` csak `ANTHROPIC_API_KEY`-jel fut. | Lásd 3. pont. |
| `a4545a8a` | `morning-briefing.sh` (commit szerint) | A kézi/timeres reggeli út csak API-kulccsal fut, előfizetéses loginnal megtagad. | Ha a timer-utat használjátok, `ANTHROPIC_API_KEY` kell a `.env`-be. |
| `ce543e42` | `install-macos.sh`, `install-lang.sh` | Ollama és ffmpeg hiba figyelmeztet, nem állítja le a telepítést. | Nincs (Linux). |
| `f6d42363` | `scripts/install-stuck-modal-guard.sh` | A launchd plist PATH-ban `$HOME/.local/bin` került előre. | macOS: a guard újratelepítése. |
| `339b86cd` | `scripts/systemd/uptime-monitor.service`, `scripts/systemd/uptime-monitor.timer` (új) | Új systemd --user unit-pár. Sem az `install-linux.sh`, sem az `update.sh` nem hivatkozik rá (`git grep uptime-monitor v1.45.0 -- install-linux.sh update.sh` üres). | Kézi telepítés, ha kell. |
| `4e98937d` | setup | Az átírt `.env` 0600 jogosultságú marad. | Nincs. |

### 2.7 Törölt vagy átnevezett fájlok

- Törölve: `src/__tests__/email-approval-gate.test.ts` (`18374b3c`, a Python suite egyszer fusson vitest-futásonként).
- Átnevezés: **NOT FOUND** (`git diff --name-status -M v1.44.0 v1.45.0` csak ezt az egy `D` sort adja).

### 2.8 Viselkedési törések (munkafolyamatot érinthetnek)

- `8562ef26`: az ütemező csak API-n regisztrált, hash-egyező feladatot futtat. Az első induláskor egyszeri backfill mindent regisztrál (`upgrade-backfill-v1`), de **utána minden kézi szerkesztés a `~/.claude/scheduled-tasks` alatt leállítja a feladatot**, amíg `register` nem fut rá. PUT/toggle 409-et ad a kívülről módosított fájlokra.
- `81b714d5`, `16e1698b`: ha már van dashboard-login, eszközkulcs kiadása, Bridge párosítás, felhasználó hozzáadás/törlés, föderációs peer token, `PUT /api/operator-access`, `GET /api/auth/users` csak a gazda sessionjével megy, a megosztott tokennel nem. Jelszó-reset jelenlegi jelszó nélkül csak CLI-ből: `npm run dashboard-user -- reset-password <username>`.
- `89cc2f33`: jóváhagyás (`PATCH status=approved`, born-approved POST) csak dashboard sessionnel vagy full-scope device key-jel.
- `2bd8e21f`, `bb9d7a37`: generált és importált skillek karanténba (`store/skills-pending/<id>/`) kerülnek, és csak a gazda hagyhatja jóvá.
- `0b152b9c`: hiányzó autonomy config vagy kulcs esetén 1-es szint (korábban 3-as).
- `a9c1e338`: `data_delete` 3-as szint alatt memória-törlés csak jóváhagyott, egyszer felhasználható jóváhagyással.
- `040ef9e8`, `e6b62d80`: minden jóváhagyás-kategória szerver oldalon egyszer fogyasztható.
- `07c6dad0`: a telepítő által párosított Bridge saját device key-t kap (alapértelmezés commit szerint változatlan, `--device-key` kapcsolóval).

---

## 3. Konfliktustérkép a 12 helyben módosított fájlra

Mérés: `git diff --numstat v1.44.0 v1.45.0 -- <fájl>` és `git log v1.44.0..v1.45.0 -- <fájl>`. A helyi változások tartalma itt NOT FOUND (lásd a bevezető korlátot), ezért a kockázat az upstream változás méretén és helyén alapul.

| # | Fájl | Változik? | Sorok (+/-) | Érintett részek | Commitok | Kockázat |
|---|------|-----------|-------------|-----------------|----------|----------|
| 1 | `.claude/settings.json` | igen | +6 / -1 | `UserPromptSubmit` lista vége (`taskstate-stub.py`), `PostToolUse` (`browser-content-notice.py @ WebSearch\|WebFetch`), `PreToolUse` eleje (`fleet-freeze-gate.sh @ *`), két új mail-matcher sor | `e9298f2b`, `95d20e78`, `e5b4ae99`, `964acff3`, `0cf4acab`, `6404419e`, `63897729` | **MEDIUM**: kevés sor, de a hook-tömbök ugyanazon soraiban, egysoros JSON-bejegyzésekkel, így egy helyi hook-bővítés szinte biztosan szomszédos hunkot ad. |
| 2 | `install-linux.sh` | igen | +16 / -1 | ütemezett feladat seedelés (~1485., ~1530. sor: `INSTALL_SCHED_REGISTER`), új registry-regisztráló blokk (~1546.), morning-timer komment (~2081.) | `8562ef26`, `a4545a8a` | **LOW**: kis, lokalizált beszúrások; csak akkor ütközik, ha a helyi módosítás a seed-ciklusokat vagy a morning-timer blokkot érinti. |
| 3 | `scripts/__tests__/voice-pronunciation.test.py` | nem | 0 | - | - | **LOW**: upstream nem nyúlt hozzá. |
| 4 | `scripts/voice/_vtools.py` | igen | +44 / -1 | `import math`; új `_PIPER_PROSODY_ENV` és `_piper_prosody_args()` közvetlenül az `apply_pronunciation()` után; a `speak()` Piper `subprocess.run` sora | `e32cf5fb` | **MEDIUM**: a beszúrás közvetlenül az `apply_pronunciation()` után van, és a `speak()` azon sorát módosítja, amely `apply_pronunciation(...)`-t hívja; ha a helyi módosítás a kiejtési logikát érinti (a helyi `voice-pronunciation.test.py` erre utal), szomszédos hunk várható. |
| 5 | `src/__tests__/agent-identity-setup.test.ts` | nem | 0 | - | - | **LOW**: a fájl változatlan, de a tesztelt `scheduleIdentitySetup` (`src/web/agent-process.ts`) változott (`54b93071`), ezért a teszt futását ellenőrizni kell. |
| 6 | `src/__tests__/agent-worker.test.ts` | nem | 0 | - | - | **LOW**: a fájl változatlan, de az `ensureWorkerCwd` mostantól a fleet-freeze hookot is beírja a worker settings-be (`964acff3`); egy settings-tartalmat pontosan ellenőrző helyi teszt elbukhat. |
| 7 | `src/__tests__/project-settings-hook-anchor.test.ts` | igen | +11 / -0 | `EXPECTED` objektum: `UserPromptSubmit`, `PostToolUse`, `PreToolUse` tömbök | `e9298f2b`, `95d20e78`, `e5b4ae99`, `964acff3`, `0cf4acab`, `6404419e`, `63897729` | **HIGH**: ez a teszt a `.claude/settings.json` hook-listáját pontosan rögzíti; a helyi settings-módosítás miatt valószínűleg ugyanezek a tömbök változtak helyben is, és a két oldalt kézzel kell egyesíteni, különben a teszt elbukik. |
| 8 | `src/pane-state.ts` | igen | +228 / -29 | `FOOTER_COUNT`/`FOOTER_SHELL_TAIL_RX`, `hasIdleFooter` környéke; új `detectBackgroundWork`, `hasBackgroundWork`; `permissionPromptSummary` átírva, új `isPermissionFileCardTitle`; új `detectsHeldPeerMessage`; új `feedbackDraftDismissPlan`; új `typedTailEchoed`, `TYPED_ECHO_TAIL_CHARS` | `620fc2b9`, `830fbcbd`, `8452c268`, `62886e7d`, `f64f3e1f`, `d1c03996`, `02ed9d42` | **HIGH**: hét commit, a footer-felismerés és a permission-prompt összefoglaló logikája átírva, ami a pane-állapot helyi javításainak tipikus helye. |
| 9 | `src/web/agent-process.ts` | igen | +229 / -32 | importok; új `explicitConfigDirLacksOwnLogin` (`a6aa0676`); `StartOpts` és `startAgentProcess` szignatúra (`402de0e1`); `stopAgentProcess`, `restartAgentProcess`; `dismissFeedbackDraftModalIfPresent`, `FEEDBACK_KEY_GAP_MS` (`8452c268`); `settleStartupGates`, `scheduleIdentitySetup` (`54b93071`); `sendPromptToSession`, új `waitForTypedEcho` (`62886e7d`); új `readRemoteTranscriptMtime` (`b14d28ac`); új `capturePaneWithHistory` (`620fc2b9`); bash-sandbox indítás (`ab414cfc`) | `620fc2b9`, `830fbcbd`, `54b93071`, `402de0e1`, `8452c268`, `62886e7d`, `ab414cfc`, `b14d28ac`, `0e754005`, `a6aa0676`, `ea848e25` | **HIGH**: 11 commit, a `startAgentProcess` szignatúrája és több indítási/küldési útvonal változott, így bármely helyi indítási módosítás szinte biztosan ütközik. |
| 10 | `src/web/agent-scaffold.ts` | igen | +1060 / -135 | hook-injektálók: `injectSenderRoleGate`/`removeSenderRoleGate` (`4c20eb80`), `injectWebSearchEnvelope`/`ensureWebSearchEnvelope` (`95d20e78`, `e5b4ae99`), `injectSecondReviewerGate`/`removeSecondReviewerGate` (`25f5fec2`); egress: `bashEgressDeny`, `mergeBashEgressDeny`, `ensureBashEgressDeny`, `LEGACY_BASH_EGRESS_DENY`, `ensureMainScopeBashEgressParser` (`61a6572b`), `YT_DLP_EGRESS_DENY`, `ytDlpIngestOnly` (`536f9308`); CLAUDE.md szekciók: `buildAutonomyBody`, `buildMessageCloseBody`, `buildSystemDirectiveAuthBody`, `buildAgentIdHeaderBody`, `buildMemorySearchLabelBody` strict paraméterrel, új `buildStrictApiBody`/`ensureStrictApiSection`, `agentRunsStrict` (`0e754005`); `buildBackgroundCheckpointBody`/`ensureBackgroundCheckpointSection` (`ea848e25`); `upgradeTaskStateHeaderInHookPrompts` (`20cae069`); `buildSkillsPathTrapBody(name)` (`441ce9c0`); `buildFleetRosterBody`, `writeAgentSettingsFromProfile` (több hunk) | 20 commit (lásd `git log v1.44.0..v1.45.0 -- src/web/agent-scaffold.ts`), pl. `4c20eb80`, `25f5fec2`, `0e754005`, `61a6572b`, `8562ef26` | **HIGH**: a legnagyobb átírás a tartományban (közel 1200 sor), számos függvény szignatúrája bővült, a helyi változtatásokat valószínűleg újra kell írni, nem csak összefésülni. |
| 11 | `src/web/agent-worker.ts` | igen | +21 / -1 | új `WORKER_FREEZE_GATE_CMD`, `withFleetFreezeGate()`; az `ensureWorkerCwd` `writeFileSync(settingsPath, ...)` sora | `964acff3` | **MEDIUM**: kis változás, de ha a helyi módosítás az `ensureWorkerCwd` settings-írását érinti, ugyanazt a sort módosítja. |
| 12 | `src/web/voice-directive.ts` | nem | 0 | - | - | **LOW**: upstream nem nyúlt hozzá. |

---

## 4. Biztonsági és adatbiztonsági javítások

- `07c6dad0`: a telepítő által párosított Bridge visszavonható saját device key-t kap a megosztott dashboard token helyett.
- `0382bb4d`: a context-guard részleges PUT nem nullázza a ki nem küldött kulcsokat (konfig-adatvesztés).
- `9b730744`: a vault headersHelper és resolver scriptek stdout-ja tiszta marad (nincs Keychain-migráció, nincs logger kimenet a titok mellett).
- `6a72b213`: egy újrahasznosított `bot.pid` nem állítja le egy másik ágens pollerét.
- `e2199840`: a késve érkező dispatch-zárás `expected_status`-szal megy, nem mozgat el egy már továbblépett kártyát.
- `0cf4acab`: a levélkapuk alapnév-szuffix szerint osztályoznak, a `send_draft` is kapu alá kerül, a hook bármely MCP szerveren tüzel.
- `ec293414`: egyetlen kimenő riasztás sem idézi a permission-kártya parancssorát (token-szivárgás ellen).
- `3818910e`: a copy-gate ékezetellenőrzése maszkolja a könyvtárakat, `key=value` párokat és idézett tokeneket.
- `a6325a49`: változó scriptútvonal csak címzett-flaggel számít küldésnek.
- `a328d3b4`: a self-pace-gate bármely kliensről tiltja az ütemezés API/store írását, nem csak curl-ből.
- `79cecc23`: a levélkapu átlép a projekt-launcher `run` alparancsán a küldő előtt.
- `0b152b9c`: hiányzó autonomy config 1-es szintre esik vissza, nem 3-asra.
- `b3dd49b3`, `1d5bca99`, `000f9f99`: a browser-content log méretkorlátos, zár alatt rotál, symlinket elutasít, `O_NOFOLLOW`-val nyit.
- `a9c1e338`, `ec4de4ec`: memória-törlés 3-as szint alatt csak jóváhagyott, egyszeri jóváhagyással; a kérés SQL-ben horgonyzott.
- `95d20e78`, `e5b4ae99`: WebSearch és WebFetch eredmény alapból megbízhatatlan tartalomként keretezve.
- `fe409665`: a címzett-ledger minden címzett-darabot ellenőriz, és nem írja felül a használhatatlan ledgert.
- `336bfadc`: a küldő scriptek maguk érvényesítik az `email_send` szintet.
- `af191d99`: a küldő scriptek maguk futtatják a kimenő szöveg ellenőrzését.
- `30b8e0d2`: a leválasztott-claude reaper megkíméli a másik telepítés tmux szerverén futó claude-okat.
- `8562ef26`: az ütemező csak regisztrált, hash-egyező feladatot futtat (beültetett feladat ellen).
- `bb9d7a37`, `c4ede16d`: generált és importált skill jóváhagyásig karanténban; vezérlőbájt nem szakítja meg a képfelismerést.
- `61a6572b`: curl https/wget host szerint bírálva, a vendor-lista érvényes (opt-in).
- `6404419e`: a "harder-mail" piszkozat- és küldőeszközök is kapun mennek át.
- `7df9f4a7`, `6e90240f`: LIKE-wildcard escape a memóriakeresés fallback ágain.
- `e7500d52`, `9d45c6c5`: egy preCheck útvonal-szabály a runnerre és a hash-re; nem string preCheck elutasítva.
- `036fecd1`, `397b3d06`, `0b88d90b`: fleet-import csak az identitás-kulcsokat írja; a `BOT_NAME` adatként olvasva, nem `source`-szal; identitás-ellenőrzés átvétel előtt.
- `e68147d0`: fő ágens azonosító nem lehet az üzenetréteg foglalt neve.
- `6131887b`: a Telegram bot token nem kerül a curl argv-be.
- `5b404c44`: elavult másolaton alapuló teljes kártya-PUT elutasítva (adatvesztés ellen).
- `f0cfd842`: eredetire hivatkozó válasz sosem standing-list küldés.
- `466b86ff`: `--resolve`/`--connect-to` minden hostja célpont; `--url @file` rejtett célként kezelve.
- `90efd6bd`: sub-ágensek további négy kapu-fájlt nem írhatnak a `store/`-ban.
- `040ef9e8`, `e6b62d80`: egyszeri, szerveroldali jóváhagyás-fogyasztás minden kategóriára; a hívó cselekvés előtt fogyaszt.
- `81b714d5`: hitelesítő adat kiadása csak gazda-sessionnel; jelszó-reset jelenlegi jelszó nélkül csak CLI-ből.
- `964acff3`: flotta-fagyasztás ("red button"), feloldás csak a gazdának.
- `16e1698b`: föderációs peer token, operátor-bővítés, felhasználólista csak gazda-sessionnel.
- `4e98937d`: az átírt `.env` 0600 marad.
- `89cc2f33`: jóváhagyás gazda-loginhoz kötve, nem a megosztott tokenhez.
- `2bd8e21f`: karanténos skillt csak a gazda hagyhat jóvá vagy utasíthat el.
- `ab414cfc`: listázott ágensek Bash-e a Claude Code sandboxban fut (opt-in).
- `ccb4b834`: megbízhatatlan bejövő üzenet injekció-mintára jelölve.
- `49c7de06`: a sub-ágens levélkapu bármilyen nevű küldő scriptet felismer.
- `25f5fec2`: opt-in második bíráló a magas kockázatú tool-hívásokra.
- `603e8cac`: a resolver scriptek a dashboardon át olvassák a titkokat, titkonkénti allowlisttel, naplózva.
- `c0eb581f`: a bot és a gazda portréja cross-origin beágyazást elutasít.
- `0e754005`, `5aa3c461`, `bda503c6`: dontAsk ágens egy allowlistes helperen át éri el az API-t; a token csak loopbackre vagy a saját originre megy, pontos host-egyezéssel.
- `a6aa0676`: explicit `MAIN_AGENT_CONFIG_DIR` saját login nélkül megtartja a flotta tokent.
- `efe82226`: a kill-gate a session saját munkakönyvtárában is olvassa a transzkriptet.
- `63897729`: a levélkapuk a Microsoft Graph MCP kötőjeles levéleszközeit is elkapják.
- `4c20eb80`: ágensenkénti feladói szerep-kapu (opt-in) a kollégák kockázatos kéréseire.
- `ef615bd6`, `f1763308`: mérő-célú host-osztály szigorúan egy curl-alakkal; a lekérdezés hossza naplózva.
- `ce733867`: ismert ágensnév `--to` után nem számít levélküldésnek eldönthetetlen programnál (téves blokk ellen).
- `20cae069`: a taskstate rekord megnevezi az íróját, idegen rekord adatként játszódik vissza.
- `fac58894`, `0282a984`, `7fad0fd1`: az egress-gate belsőnek tekinti az IPv4-mapped/embedded IPv6, NAT64, 6to4, site-local, fe80::/10 címeket és a pontra végződő vagy pont nélküli neveket (SSRF ellen).

---

## 5. Bekapcsolásra érdemes új funkciók

| Funkció | Commit | Alapállapot | Bekapcsolás |
|---------|--------|-------------|-------------|
| Flotta-fagyasztás ("red button"), `/stop` és `/resume` | `964acff3` | Elérhető (a hook mindig be van kötve, csak fagyasztáskor tilt) | Dashboard oldalsáv gomb vagy `POST /api/fleet/freeze` |
| Ütemezett-feladat registry | `8562ef26` | **Bekapcsolva**, nem kikapcsolható (commit szerint) | `node dist/web/schedule-registry-cli.js status` |
| WebSearch/WebFetch keretezés | `95d20e78`, `e5b4ae99` | **Bekapcsolva** | - |
| Injekció-gyanú jelölés bejövő üzeneten | `ccb4b834` | **Bekapcsolva** (megbízhatatlan és föderált üzenetekre) | - |
| Hook-hibák jelentése | `293ebfe2` | Elérhető | `npm run hook-failures` |
| Event-loop-lag monitor | `95a5eb22` | Bekapcsolva (commit tárgya szerint); küszöbök a kódban (`EVENT_LOOP_LAG_WARN_MS`) | - |
| Csapatjegyzetek ("Jegyzetek") oldal | `ae9c53bc` | Bekapcsolva | - |
| Kanban: tervezett kezdés, owner strip ("Rád vár"), done-evidence, stale-PUT védelem | `0da9f431`, `58c9ac9b`, `4484998c`, `5b404c44` | Bekapcsolva | - |
| Kanban atomi claim lock | `b02e0afd` | Ki | `KANBAN_CLAIM_LOCK=1` |
| Kanban dispatch kihagyás | `ce7ac9f0` | Ki (üres lista) | `KANBAN_DISPATCH_SKIP_AGENTS` |
| Napló bejegyzések tükrözése memóriába, dátumszűrés | `45ec4328` | Bekapcsolva (`POST /api/daily-log` mindig ír) | - |
| Embedding prefixek és hibrid súlyok | `3a7e6a06` | Üres / `1` | Settings |
| Beállítás visszaállítása alapra | `a00839cc` | Bekapcsolva | Settings |
| Claude előfizetés hozzáadása dashboard-loginnal | `4540f195`, `a7545867` | Bekapcsolva | Settings -> Claude plans |
| `BASH_EGRESS_HOST_ALLOW` (curl/wget host szerint) | `61a6572b` | Ki | Settings |
| `BASH_SANDBOX_AGENTS` | `ab414cfc` | Ki (senki) | Settings, `docs/bash-sandbox.md` (macOS sandbox) |
| `YT_DLP_INGEST_ONLY`, yt-ingest | `536f9308`, `bb604412` | Ki | Settings + `bwrap`, `ffmpeg` |
| Második bíráló | `25f5fec2` | Ki | profil: `"secondReviewer": true` (`docs/security-hardening.md`) |
| Feladói szerep-kapu | `4c20eb80` | Ki | `agent-config.json` `senderRoleGate` |
| Vault ACL | `603e8cac` | `audit` (naplóz, nem tilt) | `VAULT_ACL_MODE=enforce` + `store/vault-acl.json` |
| Ágensenkénti költségkeret és riasztás | `9b5f8d2b` | Csak ha `token_prices` meg van adva | `costops-config.json` |
| Háttérfeladat-halasztás kemény kereten | `40512e8d` | Ki | `enforce_agent_budgets: true` (`docs/agent-budgets.md`) |
| Fő ágens címzett-ledger | `336bfadc` | Ki | `.env`: `MAIN_AGENT_RECIPIENT_LEDGER=1` |
| Telegram reakció-plugin | `af4d67ff` | Ki | `CHANNEL_PLUGINS_EXTRA` (`docs/telegram-reaction.md`) |
| Telegram/Discord válaszgombok | `f7e07392`, `ca58d528` | Bekapcsolva (reply tool) | - |
| Teams közvetlen riasztás, credential-ellenőrzés | `aafc83e9`, `2ea4703e` | Bekapcsolva Teams fő csatornán | - |
| Uptime monitor | `339b86cd` | Ki (nincs telepítve) | `scripts/systemd/uptime-monitor.{service,timer}` + `store/uptime-targets.json` |
| Host erőforrás heartbeat | `3a8a1429` | Ki (script) | `HOST_HEARTBEAT_*` |
| `guard-run.sh` | `c1b92df6` | Script | kézi használat |
| Piper prosody | `e32cf5fb` | Ki | `VOICE_*_SCALE` env |
| Saját megerősítő dialógus ágens stop/törlés/restart | `1e562e62` | Bekapcsolva | - |
| Engedélykérés-riasztás jelölők | `620fc2b9` | `15m,30m,1h,2h,8h,24h` | `PERMISSION_ALERT_MARKS` |

---

## 6. Frissítési ellenőrzőlista (helyi módosításokkal rendelkező telepítéshez)

1. **Mentés.** Állítsd le az ütemezett auto-update-et a frissítés idejére (mechanizmusa: NOT FOUND ebben a tartományban). Ments:
   ```bash
   cp -a store/claudeclaw.db store/claudeclaw.db.pre-v145
   ```
   ```bash
   tar czf ~/marveen-store-pre-v145.tgz store .env ~/.claude/scheduled-tasks
   ```
2. **Helyi változások exportja patchként és stash-be.**
   ```bash
   git diff > ~/marveen-local-v144.patch
   ```
   ```bash
   git diff --stat > ~/marveen-local-v144.stat
   ```
   ```bash
   git stash push -m "local-v144" -- .claude/settings.json install-linux.sh scripts/__tests__/voice-pronunciation.test.py scripts/voice/_vtools.py src/__tests__/agent-identity-setup.test.ts src/__tests__/agent-worker.test.ts src/__tests__/project-settings-hook-anchor.test.ts src/pane-state.ts src/web/agent-process.ts src/web/agent-scaffold.ts src/web/agent-worker.ts src/web/voice-directive.ts
   ```
3. **Átfedés előzetes mérése.** A helyi patch hunkjait vesd össze a 3. pont függvényeivel:
   ```bash
   git diff v1.44.0 v1.45.0 -- src/web/agent-scaffold.ts src/web/agent-process.ts src/pane-state.ts > ~/upstream-v145-hot.diff
   ```
4. **Frissítés.** A projekt saját útja `update.sh` (ez git resetet és buildet végez). Alternatíva kézzel:
   ```bash
   git fetch upstream --tags
   ```
   ```bash
   git checkout v1.45.0
   ```
   ```bash
   npm ci --include=dev && npm run build
   ```
5. **Visszaalkalmazás.** Először a kis kockázatúak (`voice-pronunciation.test.py`, `voice-directive.ts`, `agent-identity-setup.test.ts`, `agent-worker.test.ts`, `install-linux.sh`), aztán a többi:
   ```bash
   git stash pop
   ```
   Ütközésnél: `.claude/settings.json` és `project-settings-hook-anchor.test.ts` együtt, mindkét oldal hook-bejegyzéseit megtartva (2.1 pont); `agent-scaffold.ts`, `agent-process.ts`, `pane-state.ts` esetén a helyi változást az új függvényszignatúrákra írd át (`startAgentProcess(name, opts: StartOpts)`, `buildAutonomyBody(name, strict)` stb.).
6. **Tesztek.**
   ```bash
   npm run typecheck
   ```
   ```bash
   npx vitest run src/__tests__/project-settings-hook-anchor.test.ts src/__tests__/agent-worker.test.ts src/__tests__/agent-identity-setup.test.ts
   ```
   ```bash
   python3 scripts/__tests__/voice-pronunciation.test.py
   ```
   ```bash
   npm test
   ```
7. **Szolgáltatások újraindítása** (Linux, unitnevek a `install-linux.sh` 1953-1954. sora szerint):
   ```bash
   systemctl --user restart "${SERVICE_ID}-dashboard"
   ```
   ```bash
   systemctl --user restart "${SERVICE_ID}-channels"
   ```
   Az első induláskor fut le a DB-migráció és az ütemezett feladatok egyszeri backfillje (`8562ef26`).
8. **Ellenőrzés utána.**
   - `node dist/web/schedule-registry-cli.js status`: minden feladat `ok`? Ha egy feladatot helyben módosítottatok, átnézés után `register <nev>`.
   - A frissítési napló `Kezi atnezesre varo utemezett feladatok` sora (`update.sh`, `8562ef26`).
   - `store/fleet-freeze.json` NEM létezik (különben minden tool-hívás tiltva, `964acff3`).
   - `npm run hook-failures` (`293ebfe2`): nincs crash-elő gate (pl. hiányzó `taskstate-stub.py`, `fleet-freeze-gate.sh`, `browser-content-notice.py`).
   - Dashboard Skills oldal: a karanténba került skillek (`bb9d7a37`).
   - Gazda-sessionnel belépve működik a jóváhagyás és a device key kiadás (`81b714d5`, `89cc2f33`).
   - Reggeli napindító: ha a `<id>-morning.timer` aktív, kell `ANTHROPIC_API_KEY` (`a4545a8a`, `e6fc670c`).
   - Ha környezeti változóként adtátok meg a `SUPPORT_OWNER_CC`-t, tegyétek át `.env`-be (`336bfadc`).
9. **Visszaállási terv.** `git checkout v1.44.0`, build, és a `store/claudeclaw.db.pre-v145` visszamásolása, ha a régi kód a bővített sémát nem kezeli (NOT FOUND, hogy kezeli-e).

---

## 7. Nyitott kérdések, amelyekre a commitok nem válaszolnak

1. A 12 helyi módosítás tényleges tartalma ebben a repóban nincs meg (a `main` `v1.43.0`-n áll, commitolatlan változás nélkül): a tényleges hunk-átfedés NOT FOUND.
2. Elindul-e a v1.44.0 kód a v1.45.0 által bővített DB-sémával (`kanban_cards.version NOT NULL`, `scheduled_task_registry`)? NOT FOUND.
3. A `scheduled_task_registry` backfill (`upgrade-backfill-v1`) egy kézzel előzőleg módosított feladatot is megbízhatónak jelöl az első induláskor; van-e utólagos audit erre? NOT FOUND a commitokban.
4. A `BASH_SANDBOX_AGENTS` (`ab414cfc`) a dokumentáció szerint macOS sandbox; Linuxon mi a viselkedés (indítási hiba vagy kihagyás)? NOT FOUND.
5. Az `uptime-monitor` systemd unitjait melyik telepítési lépés teszi fel? Az `install-linux.sh` és az `update.sh` nem hivatkozik rájuk: NOT FOUND.
6. A dashboard-login nélküli telepítéseken a megosztott token továbbra is kiadhat hitelesítő adatot (`81b714d5`: "The access token keeps them for the first-run setup only"); mi számít "first-run"-nak pontosan? NOT FOUND.
7. A `taskstate-stub.py` (`e9298f2b`) minden prompthoz ír; van-e méret- vagy forgáskorlát? NOT FOUND.
8. A `964acff3` fagyasztás alatt a sorban álló üzenetek a feloldás után mennek ki; van-e időkorlát vagy lejárat a sorra? NOT FOUND.
9. Melyik minimális Claude Code verzió kell a teljes v1.45.0-hoz (nem csak a `telegram-reaction` pluginhoz)? NOT FOUND.
10. A `agent-scaffold.ts` startup-migrációi (`ensureWebSearchEnvelope`, `ensureBashEgressDeny`) felülírják-e a sub-ágensek kézzel szerkesztett settings-fájljait, vagy csak kiegészítik? A commit üzenetek részben írják le (`95d20e78`: "re-anchors it after a host move"), teljes válasz NOT FOUND.
