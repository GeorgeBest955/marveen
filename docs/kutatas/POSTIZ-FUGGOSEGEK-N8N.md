# Postiz: függőségi telemetria és az n8n node

- Vizsgált Postiz commit: `35a482901583ed4219ff43afffde184e8ee373a6` (`git fetch --depth 1 origin HEAD` 2026-10-30-án ugyanezt adta vissza, újabb commit nincs).
- Vizsgált n8n repó: https://github.com/gitroomhq/postiz-n8n, commit `152f5b6390ea06fbcae9a7e2567d846b06a6413d`.
- Előzmény: `docs/kutatas/POSTIZ-ATVILAGITAS.md` (8. pont, 2. nyitott kérdés).
- Módszer: a csomagokat a `pnpm-lock.yaml` pontos verzióival `npm pack <név>@<verzió>` paranccsal töltöttem le és bontottam ki, és a **publikált** `dist` kódot vizsgáltam (nem a GitHub forrást). A sorszámok ezekre a kibontott fájlokra vonatkoznak (`package/...`).
- Nem jogi és nem hálózati mérés: futó Postiz példány forgalmát nem rögzítettem. Egy kivétel: a pnpm telepítési viselkedést egy kis próbaprojekttel ténylegesen lefuttattam (1.1 pont).

---

## 1. RÉSZ: Függőségi telemetria

### 1.0 Verziók a lockfile-ban

| Csomag | Verzió | Lockfile sor | Telemetria-függőség (lockfile sor) |
|---|---|---|---|
| `@copilotkit/runtime` | 1.72.0 | `pnpm-lock.yaml:2334` | `'@scarf/scarf': 1.4.0` (`:20561`), `'@segment/analytics-node': 2.3.0` (`:20562`) |
| `@copilotkit/shared` | 1.72.0 | `pnpm-lock.yaml:2368` | `'@segment/analytics-node': 2.3.0` (`:20617`) |
| `@copilotkit/react-core` | 1.72.0 | (snapshot: `:20431` környéke) | `'@scarf/scarf': 1.4.0` (`:20431`) |
| `@mastra/core` | 1.67.0 | `pnpm-lock.yaml:4178` | `posthog-node: 5.52.4(rxjs@7.8.2)` (`:22312`) |
| `swagger-ui-dist` | 5.32.13 | `pnpm-lock.yaml:16552` | `'@scarf/scarf': 1.4.0` (`:38100`) |
| `@scarf/scarf` | 1.4.0 | `pnpm-lock.yaml:6331` | |
| `@segment/analytics-node` | 2.3.0 | `pnpm-lock.yaml:6376` | |
| `posthog-node` | 5.52.4 | `pnpm-lock.yaml:14989` | |

A `swagger-ui-dist`-et a `@nestjs/swagger@11.4.7` húzza be (`pnpm-lock.yaml:22820`: `swagger-ui-dist: 5.32.13`); a Postiz közvetlenül a `@nestjs/swagger`-t függi (`package.json:80`).

Telepítéskori szkriptek (a kibontott `package.json` fájlok `scripts` mezője alapján): `postinstall` csak a `@scarf/scarf` csomagban van. A `@copilotkit/runtime`, `@copilotkit/shared`, `@copilotkit/react-core`, `@mastra/core`, `swagger-ui-dist`, `@segment/analytics-node`, `posthog-node` csomagnak nincs `preinstall`/`install`/`postinstall` szkriptje (parancs: `node -e "console.log(require('./package/package.json').scripts)"` minden kibontott csomagon).

### 1.1 `@scarf/scarf` 1.4.0 (a `@copilotkit/runtime`, `@copilotkit/react-core` és `swagger-ui-dist` függősége)

**Hol küld:**
- `package/package.json:15`: `"postinstall": "node ./report.js",`
- `package/report.js:10`: `const scarfHost = localDevPort ? 'localhost' : 'scarf.sh'`
- `package/report.js:377-383`:
  ```js
  const infoPayload = {
    libraryType: 'npm',
    rawPlatform: os.platform(),
    rawArch: os.arch(),
    nodeVersion: process.versions.node,
    dependencyInfo: dependencyInfo
  }
  ```
- `package/report.js:388-392`: `host: scarfHost,` ... `method: 'POST',` `path: '/package-event/install',`, majd `:406`: `const req = https.request(reqOptions, (res) => {`
- Küldött adat: operációs rendszer, architektúra, Node verzió, és a függőségi fa adatai (a `dependencyInfo` a `redactSensitivePackageInfo(dependencyInfo)` hívás után, `report.js:375`).

**Alapállapot:** bekapcsolva, `report.js:43-46`: `defaultOptIn: true`.

**Kikapcsolás:** `report.js:56-58`:
```js
const userHasOptedOut = (rootPackage) => {
  return (rootPackage && rootPackage.scarfSettings && rootPackage.scarfSettings.enabled === false) ||
    (process.env.SCARF_ANALYTICS === 'false' || process.env.SCARF_NO_ANALYTICS === 'true' || process.env.DO_NOT_TRACK === '1')
```
Tehát `SCARF_ANALYTICS=false`, `SCARF_NO_ANALYTICS=true`, `DO_NOT_TRACK=1`, vagy a gyökér `package.json`-ben `"scarfSettings": { "enabled": false }`.

**Mikor fut:** csak telepítéskor (`postinstall`). Futásidejű Scarf hívás: a `swagger-ui-dist` publikált fájljaiban NOT FOUND (parancs: `grep -rnoI "scarf" swagger-ui-dist_5.32.13/package | grep -v "package.json\|README"`, üres eredmény).

**Lefut-e a Postiz telepítésekor? A mérés szerint NEM.**
- A Postiz image pnpm 10.6.1-gyel települ: `Dockerfile.dev:18`: `RUN npm --no-update-notifier --no-fund --global install pnpm@10.6.1 pm2`.
- A Postiz csak a `bcrypt` build szkriptjét engedélyezi: `package.json:344-346`: `"onlyBuiltDependencies": [ "bcrypt" ]`.
- Próba: egy üres projektben `{"dependencies":{"swagger-ui-dist":"5.32.13"},"pnpm":{"onlyBuiltDependencies":["bcrypt"]}}`, majd `SCARF_VERBOSE=true npx -y pnpm@10.6.1 install`. Eredmény a kimenetben: `Ignored build scripts: @scarf/scarf.` A `report.js` tehát nem futott.
- Következmény: a hivatalos Postiz build alatt a Scarf nem küld. Ha valaki npm-mel vagy a szkripteket engedélyező pnpm beállítással telepít, a Scarf alapból küldene.

### 1.2 `@copilotkit/shared` 1.72.0 (a telemetria-kliens)

**Kikapcsolás kódja:** `package/dist/telemetry/telemetry-disabled.mjs:13-15`:
```js
function isTelemetryDisabled() {
	return process.env.COPILOTKIT_TELEMETRY_DISABLED === "true" || process.env.COPILOTKIT_TELEMETRY_DISABLED === "1" || process.env.DO_NOT_TRACK === "true" || process.env.DO_NOT_TRACK === "1";
}
```

**A kliens:** `package/dist/telemetry/telemetry-client.mjs`
- `:6`: `import { Analytics } from "@segment/analytics-node";`
- `:17`: `this.sampleRate = .05;` (alapból az események 5%-a megy ki)
- `:21-22`: `this.telemetryDisabled = telemetryDisabled || isTelemetryDisabled();` és `if (this.telemetryDisabled) return;`
- `:24`: `this.segment = new Analytics({ writeKey: process.env.COPILOTKIT_SEGMENT_WRITE_KEY || "n7XAZtQCGS2v1vvBy3LgBCv2h3Y8whja" });`
- `:42`: `if (!identity.licenseTelemetryId && !this.shouldSendEvent()) return;` (mintavétel)
- `:62`: `await lambdaClient.send({` (első csatorna)
- `:75-79`: `if (this.segment) this.segment.track({ anonymousId: this.anonymousId, event, properties: { ...orderedPropertiesWithGlobal } });` (második csatorna)
- `:149`: `if (process.env.COPILOTKIT_TELEMETRY_SAMPLE_RATE) _sampleRate = parseFloat(process.env.COPILOTKIT_TELEMETRY_SAMPLE_RATE);`

**Két célpont:**
- `package/dist/telemetry/lambda-client.mjs:2`: `const TELEMETRY_SINK_URL = typeof process !== "undefined" && process.env?.COPILOTKIT_TELEMETRY_URL || "https://telemetry.copilotkit.ai/ingest";` és `:72`: `await fetch(TELEMETRY_SINK_URL, {`
- Segment: `@segment/analytics-node@2.3.0`, `package/dist/esm/plugins/segmentio/publisher.js:32`: `this._url = tryCreateFormattedUrl(host ?? 'https://api.segment.io', path ?? '/v1/batch');`

**Mikor:** futásidőben, nincs telepítési szkript.

### 1.3 `@copilotkit/runtime` 1.72.0

**Hol küld (a Postiz által használt útvonalon):**
- `package/dist/lib/telemetry-client.mjs:10-13`: modul betöltésekor `const telemetryClient = new TelemetryClient({ packageName: packageJson.name, packageVersion: packageJson.version });` (ez még nem küld, csak létrehozza a klienst).
- `package/dist/lib/integrations/node-http/index.mjs:12`: `options.runtime.telemetry.capture("oss.runtime.instance_created", getRuntimeInstanceTelemetryInfo(options));`
- `package/dist/lib/runtime/copilot-runtime.mjs:177-183`: kérésenként `this.telemetry.capture("oss.runtime.copilot_request_created", {` a `"cloud.guardrails.enabled"`, `requestType`, `"cloud.api_key_provided"`, `"cloud.base_url"` mezőkkel.
- Ügynök-futás eseményei: `package/dist/lib/runtime/telemetry-agent-runner.mjs:42`: `this.telemetry.capture("oss.runtime.agent_execution_stream_started", { hashedLgcKey: this.hashedLgcKey });`, valamint `:59` (`..._errored`) és `:65` (`..._ended`).

**Mit küld (`instance_created`):** `package/dist/lib/telemetry-client.mjs:40-48`: `actionsAmount`, `endpointsAmount`, `endpointTypes`, `agentsAmount`, `hashedLgcKey`, `"cloud.api_key_provided"`, és ha van, `"cloud.public_api_key"` és `"cloud.base_url"`. Globális mezők: csomagnév és verzió (`@copilotkit/shared` `telemetry-client.mjs:25-28`), keretrendszer (`node-http/index.mjs:10`: `telemetryClient.setGlobalProperties({ runtime: { framework: "node-http" } });`). Üzenettartalom, prompt: a fenti hívásokban NOT FOUND.

**Indítási log:** `package/dist/lib/telemetry-disclosure.mjs:18-20`: ha nincs kikapcsolva, a konzolra ír: `[CopilotKit Runtime] telemetry enabled` ... `(set COPILOTKIT_TELEMETRY_DISABLED=true)`.

**Alapállapot:** BE (5% mintavétellel). **Kikapcsolás:** `COPILOTKIT_TELEMETRY_DISABLED=true` vagy `1`, vagy `DO_NOT_TRACK=true` vagy `1` (1.2 pont kódja). Ez a Postiz repóban sehol nincs beállítva (parancs: `grep -rn "COPILOTKIT\|MASTRA_TELEMETRY\|DO_NOT_TRACK" docker-compose.yaml .env.example Dockerfile.dev`, kilépési kód 1, nincs találat).

**Behívja-e a Postiz?** IGEN, de csak az AI chat használatakor:
- `apps/backend/src/api/routes/copilot.controller.ts:11-15`: `import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint, } from '@copilotkit/runtime';` (a backend induláskor betölti, ez létrehozza a klienst, de nem küld).
- `copilot.controller.ts:48` (`@Post('/chat')`) és `:58`: `const copilotRuntimeHandler = copilotRuntimeNodeHttpEndpoint({`, valamint `:70` (`@Post('/agent')`), `:100`: `const runtime = new CopilotRuntime({`, `:104`.
- Mindkét végpont előbb ellenőrzi az OpenAI kulcsot (`copilot.controller.ts:50-56` és `:77-83`: `process.env.OPENAI_API_KEY === undefined || process.env.OPENAI_API_KEY === ''` esetén visszatér). Tehát **OpenAI kulcs nélkül nem fut le a telemetriát kiváltó kód**; kulccsal minden `/copilot/chat` és `/copilot/agent` kérés eseményt generál (ebből kb. 5% megy ki).

### 1.4 `@copilotkit/react-core` 1.72.0 (frontend)

- Telemetria-kliens a publikált kódban: NOT FOUND (parancs: `grep -rlI "telemetry.copilotkit\|segment\|TelemetryClient" _copilotkit_react-core_1.72.0/package/dist`, üres eredmény).
- Egyetlen érintett függősége a `@scarf/scarf` (lásd 1.1), amelynek `postinstall` szkriptje a Postiz pnpm beállításával nem fut le.

### 1.5 `@mastra/core` 1.67.0 (a `posthog-node` függőség)

**Hol küld:** `package/dist/feature-telemetry-C4P71GGd.js`
- `:3`: `import { PostHog } from "posthog-node";`
- `:5-6`: `const POSTHOG_API_KEY = "phc_SBLpZVAB6jmHOct9CABq3PF0Yn5FU3G2FgT4xUr2XrT";` és `const POSTHOG_HOST = "https://us.posthog.com";`
- `:29-34`: `client = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST, flushAt: 1, flushInterval: 0, disableGeoip: false });`
- `:51-58`: `posthog.capture({ distinctId: ..., event, properties: { ...getSystemProperties(), ...properties } });`
- Küldött adat: `:38-45`: `os`, `os_version`, `node_version`, `platform`, `machine_id` (a hosztnév SHA-256 hash első 16 karaktere, `:21-22`), `mastra_version`; plusz `:65`: `projectId` (a munkakönyvtár hash-e), a funkció neve és darabszámok (ügynökök, workflow-k, eszközök stb., `:127-150`). A `telemetry/index.js:52-60` szerint a token-felhasználás összesítése is küldhető, ha az observability metrikák be vannak kapcsolva.

**Alapállapot és kikapcsolás:** `:13-17`:
```js
function isTelemetryEnabled() {
	const value = process.env["MASTRA_TELEMETRY_DISABLED"];
	if (!value) return true;
	return !TRUTHY_DISABLED_VALUES.has(value.trim().toLowerCase());
}
```
és `:7-11`: `"1"`, `"true"`, `"yes"`. Tehát alapból BE, kikapcsolás: `MASTRA_TELEMETRY_DISABLED=1` (vagy `true`, `yes`). A `DO_NOT_TRACK`-et a Mastra nem olvassa (parancs: `grep -rnI "DO_NOT_TRACK" dist --include=*.js`, nincs találat).

**Mikor és mi indítja:** futásidőben. Hívási pontok a csomagban (parancs: `grep -rnI "syncFeatureUsageTelemetry(\|trackFeatureUsage(\|syncUsageTelemetry(" --include=*.js .`):
- `package/dist/mastra-CCeMcPkn.js:1862`: `trackFeatureUsage("file_based_agents", { fs_agent_count: registeredCount });`, az `__registerFsAgents` metódusban (`:1847`), amelynek dokumentációja: `Intended to be called by the bundler/dev generated entry, not by user code.` (`:1843`).
- A `syncFeatureUsageTelemetry` és `syncUsageTelemetry` csak exportálva van (`package/dist/telemetry/index.js:133`), a `Mastra` osztály nem hívja; a dokumentáció szerint `Runs once at server startup` (`telemetry/index.js:58`), vagyis a Mastra saját szervere/CLI-je hívja.

**Behívja-e a Postiz?** A kód alapján NEM.
- A Postiz a `Mastra` osztályt kódban regisztrált ügynökkel példányosítja: `libraries/nestjs-libraries/src/chat/mastra.service.ts:14-22` (`new Mastra({ storage: pStore, agents: { postiz: ... }, logger: ... })`).
- `__registerFsAgents`, `@mastra/core/telemetry`, `syncFeatureUsageTelemetry` a Postizban: NOT FOUND (parancs: `grep -rln "@mastra/core/telemetry\|syncFeatureUsageTelemetry\|__registerFsAgents" apps libraries`, kilépési kód 1).
- Megjegyzés: a Postiz a `mastra` CLI csomagot is függőségként tartalmazza (`package.json:184`: `"mastra": "^1.30.0",`), de a Postiz szkriptjei nem futtatják (parancs: `grep -n "mastra " package.json apps/*/package.json`, nincs találat). Ha valaki kézzel futtatja a `mastra` parancsot, az a saját telemetriáját használhatja; ezt nem vizsgáltam.

### 1.6 `swagger-ui-dist` 5.32.13

- Futásidejű telemetria: NOT FOUND (1.1 pont parancsa). A csomag statikus Swagger UI fájlokat tartalmaz.
- A Postiz kiszolgálja: `apps/backend/src/main.ts:80`: `loadSwagger(app);`, `libraries/helpers/src/swagger/load.swagger.ts:12`: `SwaggerModule.setup('docs', app, document);`. Ez nem küld adatot harmadik félnek (a fájlok helyben vannak).
- Egyetlen telemetria-útja a `@scarf/scarf` `postinstall` (1.1 pont), amely a Postiz pnpm beállításával nem fut le.

### 1.7 Összesítő táblázat

| Csomag | Mit küld | Mikor | Alapból | Hogyan kapcsolható ki | A Postiz kiváltja? |
|---|---|---|---|---|---|
| `@scarf/scarf` 1.4.0 (via `@copilotkit/runtime`, `@copilotkit/react-core`, `swagger-ui-dist`) | OS, architektúra, Node verzió, függőségi fa, a `scarf.sh` címre | telepítéskor (`postinstall`) | BE | `SCARF_ANALYTICS=false`, `SCARF_NO_ANALYTICS=true`, `DO_NOT_TRACK=1`, vagy `scarfSettings.enabled=false` | NEM: pnpm 10.6.1 + `onlyBuiltDependencies: ["bcrypt"]` mellett mérten `Ignored build scripts: @scarf/scarf.` |
| `@copilotkit/shared` 1.72.0 | a runtime eseményei a `telemetry.copilotkit.ai/ingest` és az `api.segment.io` címre | futásidőben | BE, 5% mintavétel | `COPILOTKIT_TELEMETRY_DISABLED=true` vagy `1`, `DO_NOT_TRACK=true` vagy `1` | csak a runtime-on keresztül (lásd alább) |
| `@copilotkit/runtime` 1.72.0 | `instance_created`, `copilot_request_created`, `agent_execution_stream_*`: darabszámok, végponttípusok, csomagverzió, keretrendszer, cloud kulcs jelzés | futásidőben, `/copilot/chat` és `/copilot/agent` kéréskor | BE, 5% mintavétel | mint fent | IGEN, de csak ha `OPENAI_API_KEY` be van állítva és valaki használja az AI chatet |
| `@copilotkit/react-core` 1.72.0 | futásidőben NOT FOUND | | | | NEM (csak a Scarf `postinstall`) |
| `@mastra/core` 1.67.0 (`posthog-node` 5.52.4) | hash-elt hosztnév és projektútvonal, OS, Node, verzió, funkcióhasználati darabszámok, a `us.posthog.com` címre | futásidőben | BE | `MASTRA_TELEMETRY_DISABLED=1` (vagy `true`, `yes`) | NEM: a Postiz nem hívja a `__registerFsAgents` és a `sync*Telemetry` függvényt |
| `swagger-ui-dist` 5.32.13 | futásidőben NOT FOUND | | | | NEM |

**Ajánlott, biztonsági tartalékként:** a Postiz konténer környezetébe `COPILOTKIT_TELEMETRY_DISABLED=true`, `DO_NOT_TRACK=1`, `MASTRA_TELEMETRY_DISABLED=1`, `SCARF_ANALYTICS=false`. Ezek a fenti idézett kód szerint a csomagok saját kikapcsolói; a Postiz egyiket sem állítja be.

---

## 2. RÉSZ: Az n8n node (`gitroomhq/postiz-n8n`)

### 2.1 Alapadatok

- Csomag: `package.json:2`: `"name": "n8n-nodes-postiz",`, `:3`: `"version": "0.2.17",`
- Utolsó commit: `152f5b6390ea06fbcae9a7e2567d846b06a6413d`, `Tue Oct 7 18:08:35 2025 +0700`, üzenet: `feat: binary data node` (parancs: `git log -1 --format='%H %cd %s'`). Első commit: `Wed Jul 9 01:06:48 2025 +0700`, összesen 40 commit.
- npm: `npm view n8n-nodes-postiz version time.modified license` eredménye: `0.2.17`, `2025-10-07T11:09:01.006Z`, `MIT`. A publikált csomag (`npm pack n8n-nodes-postiz`) `dist` kódja ugyanazokat a végpontokat hívja, mint a repó (`package/dist/nodes/Postiz/Postiz.node.js:680-750`, `package/dist/nodes/Postiz/GenericFunctions.js:8`).
- Licenc: `package.json:11`: `"license": "MIT",`. A `LICENSE.md:1` szövege viszont: `Copyright 2022 n8n` (az n8n starter sablon MIT licence, a Postiz neve nélkül).

### 2.2 Műveletek és a hívott végpontok

Műveletlista: `nodes/Postiz/Postiz.node.ts:41-79`. Az összes hívás a `postizApiRequest` függvényen át megy, amely elé teszi a `/public/v1` előtagot (2.3 pont).

| Művelet (`value`) | Megjelenített név | Végpont | Hívás helye |
|---|---|---|---|
| `createPost` | Create Post | `POST /public/v1/posts` | `Postiz.node.ts:706` |
| `getPosts` | Get Posts | `GET /public/v1/posts` (`startDate`, `endDate`, `customer`) | `Postiz.node.ts:714-720` |
| `uploadFile` | Upload File | `POST /public/v1/upload` (multipart, `file` mező) | `Postiz.node.ts:741-743` |
| `getIntegrations` | Get Channels | `GET /public/v1/integrations` | `Postiz.node.ts:747` |
| `deletePost` | Delete Post | `DELETE /public/v1/posts/{postId}` | `Postiz.node.ts:752` |
| `generateVideo` | Generate Video | `POST /public/v1/generate-video` (`type`, `output`, `customParams`) | `Postiz.node.ts:760-778` |
| `videoFunction` | Video Function | `POST /public/v1/video/function` | `Postiz.node.ts:790-805` |
| (credential teszt) | | `GET /public/v1/is-connected` | `credentials/PostizApi.credentials.ts:42-43` |

A `createPost` törzse (`Postiz.node.ts:698-704`): `type`, `shortLink`, `date`, `tags`, `posts`; minden posztban `integration: { id }`, `value` (`content`, `id`, `image[{id, path}]`), `group`, `settings` (`:687-694`). Típusok: `draft`, `schedule`, `now` (`:243-251`).

### 2.3 Hitelesítés és saját példány

- Credential mezők: `credentials/PostizApi.credentials.ts:14-19` (`API Key`, jelszó típusú) és `:21-24`: `name: 'host',` `default: 'https://api.postiz.com',`.
- Fejléc: `PostizApi.credentials.ts:34-36`: `headers: { Authorization: '={{$credentials.apiKey}}', }` (az API kulcs nyersen, `Bearer` előtag nélkül). Ez egyezik a Postiz middleware-rel, amely a `req.headers.authorization` értéket olvassa (`apps/backend/src/services/auth/public.auth.middleware.ts:24-25`).
- Alap URL: `nodes/Postiz/GenericFunctions.ts:25`: `baseURL: credentials.host + '/public/v1' as string,`
- **Saját Postiz példány: IGEN**, a `host` mező szabadon átírható. A README: `README.md:16-19`: `If you are self-hosting Postiz on port 5000 (reverse proxy),` / `Your host must end with /api for example:` / `http://yourdomain.com/api`. Ez egyezik a Postiz nginx konfigjával (`var/docker/nginx.conf:20-21`: `location /api/ { proxy_pass http://localhost:3000/;`). Self-host esetén tehát a `host` értéke pl. `https://postiz.example.com/api`.

### 2.4 Telemetria vagy harmadik fél

- Telemetria, analitika: NOT FOUND (parancs: `grep -rnI -i "telemetry\|analytics\|posthog\|sentry\|segment\|fetch(\|axios" --exclude=pnpm-lock.yaml --exclude-dir=.git nodes credentials index.js package.json`, kilépési kód 1).
- Kódban szereplő külső URL-ek (parancs: `grep -rnI "https\?://" --exclude=pnpm-lock.yaml --exclude-dir=.git .`): csak dokumentációs linkek (`docs.postiz.com`) és az alapértelmezett `https://api.postiz.com` host (`PostizApi.credentials.ts:24`). Figyelem: ha a felhasználó nem írja át a hostot, az API kulcs és a posztok a Postiz Cloudba mennek.
- Más hálózati hívás nincs: minden kérés az n8n `httpRequestWithAuthentication` helperén megy a beállított hostra (`GenericFunctions.ts:38`).

### 2.5 Összevetés a Postiz aktuális Public API-jával

Postiz oldal: `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts` (`@Controller('/public/v1')`, `:64`).

**Egyező útvonalak:** `POST /posts` (`:146`), `GET /posts` (`:133`), `DELETE /posts/:id` (`:233`), `POST /upload` (`:80`), `GET /integrations` (`:320`), `GET /is-connected` (`:252`), `POST /generate-video` (`:503`), `POST /video/function` (`:512`).

**Eltérések:**

1. **`/video/function` paraméterei nem érkeznek meg.** A Postiz a `body.params` mezőt adja tovább: `public.integrations.controller.ts:515-519`: `return this._mediaService.videoFunction( body.identifier, body.functionName, body.params );`, a DTO: `libraries/nestjs-libraries/src/dtos/videos/video.function.dto.ts:10`: `params: any;`. Az n8n node a további paramétereket a törzs legfelső szintjére teszi: `Postiz.node.ts:800-801`: `additionalParametersParam.parameter.forEach((param: any) => { body[param.key] = param.value; });`. Így a Postiz oldalon a `params` értéke `undefined` lesz. (Hogy ez mely `functionName` esetén okoz hibát, futtatás nélkül nem ellenőriztem.)
2. **`createPost` és a `__type`:** az n8n nem küld `settings.__type` mezőt (`Postiz.node.ts:643-670`), de ez NEM hiba: a Postiz pótolja, `libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts:437-440`: `settings: { ...(post.settings || ({} as any)), __type: integration.providerIdentifier, },`.
3. **`createPost` típusai:** a Postiz DTO-ja a `update` típust is elfogadja (`create.post.dto.ts:100`: `@IsIn(['draft', 'schedule', 'now', 'update'])`), az n8n csak `draft`, `schedule`, `now` értéket kínál (`Postiz.node.ts:243-251`). A `creationMethod` mezőt (`public.integrations.controller.ts:223-228`) az n8n nem küldi, így a Postiz `'API'` értéket rögzít.
4. **`uploadFile`:** az n8n nem küldi az opcionális `adjust` mezőt (`public.integrations.controller.ts:85`: `@Body('adjust') adjust: string = 'false'`), ezért mindig az igazítás nélküli mentés fut. Nem hiba, csak hiányzó opció.
5. **A node-ban nem elérhető Postiz végpontok** (a controller alapján): `POST /upload-from-url` (`:103`), `GET /find-slot/:id` (`:124`), `DELETE /posts/group/:group` (`:243`), `GET /media` (`:258`), `GET /media/:id/status` (`:282`), `GET /me` (`:293`), `GET /groups` (`:309`), `GET /social/:integration` (`:344`), `GET /users` (`:397`), `GET /debug/posts/:id` (`:413`), `GET /debug/account` (`:429`), `GET /debug/channels` (`:442`), `GET /debug/activity` (`:452`), `POST /credits/reset` (`:472`), `GET /notifications` (`:491`), `POST /clipping` (`:522`), `GET /clipping` (`:531`).
6. **Mezőnevek, amelyek egyeznek:** `GET /posts` lekérdezés: Postiz `libraries/nestjs-libraries/src/dtos/posts/get.posts.dto.ts:8-16` (`startDate`, `endDate`, opcionális `customer`), n8n `Postiz.node.ts:714-718`: azonos. `generate-video`: Postiz `video.dto.ts:27-33` (`type`, `output` `vertical`/`horizontal`, `customParams`), n8n `Postiz.node.ts:760-764`: azonos.

---

## 3. Nyitott kérdések

1. Futó Postiz példány hálózati forgalmát nem mértem; az 1. rész a publikált csomagkód statikus elemzése, kivéve a Scarf/pnpm próbát.
2. Ha a Postizt nem a hivatalos `Dockerfile.dev` szerint, hanem npm-mel vagy más pnpm beállítással telepítik, a Scarf `postinstall` lefuthat; ezt csak a pnpm 10.6.1 + `onlyBuiltDependencies: ["bcrypt"]` esetre mértem.
3. A `mastra` CLI csomag (`package.json:184`) telemetriáját nem vizsgáltam, mert a Postiz szkriptjei nem futtatják.
4. A `/video/function` eltérés gyakorlati hatása (melyik `functionName` igényel `params`-t) futtatás nélkül nem igazolt.
5. A `postiz-n8n` repó utolsó commitja 2025-10-07; azóta a Postiz Public API-ja bővült (5. eltérés), de hogy a node karbantartása folyik-e, a repóból nem állapítható meg.
