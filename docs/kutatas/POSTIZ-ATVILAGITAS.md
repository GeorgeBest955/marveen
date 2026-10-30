# Postiz átvilágítás (self-hosted telepítés előtt)

- Vizsgált repó: https://github.com/gitroomhq/postiz-app
- Vizsgált commit: `35a482901583ed4219ff43afffde184e8ee373a6` (2026-10-30), `version.txt`: `v1.47.0`
- Módszer: a repó klónozása (`git clone --depth 1`), majd a forráskód, a konfigurációs fájlok és a lockfile átnézése. A docs.postiz.com és a postiz.com oldalakat NEM néztem meg; ahol a repó csak oda hivatkozik, azt jelzem.
- Jelölések: **KÓD** = amit a forráskód ténylegesen csinál; **DOKS** = amit a README, a `.env.example` kommentjei vagy más leírás állít. NOT FOUND = a repóban nem található.

---

## 1. Mi ez és hogyan fut

### 1.1 Architektúra (KÓD)

Pnpm monorepo (`package.json`, `pnpm-workspace.yaml`). Alkalmazások az `apps/` alatt:

| Komponens | Hely | Szerep | Indítás |
|---|---|---|---|
| backend | `apps/backend` | NestJS API, Public API, MCP szerver | `apps/backend/package.json:8`: `node --experimental-require-module ./dist/apps/backend/src/main.js` |
| frontend | `apps/frontend` | Next.js felület | `apps/frontend/package.json:12`: `next start -p 4200` |
| orchestrator | `apps/orchestrator` | Temporal worker: workflow-k és activity-k (posztolás, e-mail, webhook, token frissítés) | `apps/orchestrator/package.json:8` |
| commands | `apps/commands` | NestJS parancssori feladatok (`agent.run.ts`, `configuration.ts`, `refresh.tokens.ts`) | `apps/commands/package.json:8` |
| extension | `apps/extension` | Chrome bővítmény (cookie alapú integrációkhoz, pl. Skool, lásd `.env.example:120`) | külön build |
| sdk | `apps/sdk` | `@postiz/node` NodeJS SDK | npm csomag |

Közös kód: `libraries/nestjs-libraries` (adatbázis, integrációk, AI, e-mail, feltöltés), `libraries/helpers`, `libraries/react-shared-libraries`.

- Adatbázis: PostgreSQL Prisma ORM-mel. Séma: `libraries/nestjs-libraries/src/database/prisma/schema.prisma`. Migráció nincs, induláskor `prisma db push` fut: `package.json:18`: `"pm2-run": "pm2 delete all || true && pnpm run prisma-db-push && pnpm run --parallel pm2 && pm2 logs"`.
- Sor és háttérmunka: Temporal (`TEMPORAL_ADDRESS`), ehhez külön Temporal szerver, saját PostgreSQL és Elasticsearch tartozik (`docker-compose.yaml:180-259`).
- Redis: `REDIS_URL` (`docker-compose.yaml:13`).
- A konténeren belül nginx a 5000-es porton fogad, `/api/` a backendre (3000), minden más a frontendre (4200) megy: `var/docker/nginx.conf:15`, `:20-21` (`proxy_pass http://localhost:3000/;`).
- A konténer három Node folyamatot futtat pm2 alatt (backend, frontend, orchestrator): `Dockerfile.dev:28`: `CMD ["sh", "-c", "nginx && pnpm run pm2"]`.

**Ellentmondás (DOKS kontra KÓD):** a repó gyökerében lévő `CLAUDE.md` azt írja: `apps/frontend - this is the code of the frontend (Vite ReactJS)`, de a frontend Next.js (`apps/frontend/next.config.js`, `apps/frontend/package.json:10`: `"build": "next build"`). A README (`README.md:125-129`) helyesen `NextJS (React)`, `NestJS`, `Prisma (Default to PostgreSQL)`, `Temporal`, `Resend (email notifications)` elemeket sorol fel.

### 1.2 Hivatalos self-host módszer

- **DOKS:** `README.md` Quick Start: `To have the project up and running, please follow the [Quick Start Guide](https://docs.postiz.com/quickstart)`. A telepítési útmutató tehát a repón KÍVÜL van (NOT FOUND a repóban).
- **KÓD:** a repóban Docker Compose fájl van: `docker-compose.yaml`, image: `ghcr.io/gitroomhq/postiz-app:latest` (`docker-compose.yaml:3`). Az image a `Dockerfile.dev` alapján épül (`.github/workflows/build-containers.yml:53`), amd64 és arm64 változatban (`build-containers.yml:26-28`).
- Alternatívák a repóban: `railway.toml` (Railway), `.devcontainer/devcontainer.json`. A README Coolify-t és Railway-t is említ (`README.md:157`).

### 1.3 A Compose fájl összes szolgáltatása (`docker-compose.yaml`)

| Szolgáltatás | Image | Kötelező? | Port a hoszton |
|---|---|---|---|
| `postiz` | `ghcr.io/gitroomhq/postiz-app:latest` | igen | `4007:5000` (`:125-126`) |
| `postiz-postgres` | `postgres:17-alpine` | igen | nincs |
| `postiz-redis` | `redis:7.2` | igen | nincs |
| `spotlight` | `ghcr.io/getsentry/spotlight:latest`, `pull_policy: always` | nem (hibakeresés: `# For Application Monitoring / Debugging`) | `8969:8969` (`:171-172`) |
| `temporal-elasticsearch` | `elasticsearch:7.17.27`, `ES_JAVA_OPTS=-Xms256m -Xmx256m`, `xpack.security.enabled=false` | igen (a `temporal` ettől függ) | nincs |
| `temporal-postgresql` | `postgres:16` | igen | nincs |
| `temporal` | `temporalio/auto-setup:1.28.1` | igen | `7233:7233` (`:213-214`) |
| `temporal-admin-tools` | `temporalio/admin-tools:1.28.1-tctl-1.18.4-cli-1.4.1` | nem (adminisztráció) | nincs |
| `temporal-ui` | `temporalio/ui:2.34.0` | nem (felület) | `8080:8080` (`:258-259`) |

Összesen 9 konténer, ebből a működéshez minimum 6 kell (postiz, postiz-postgres, postiz-redis, temporal, temporal-postgresql, temporal-elasticsearch). Az "igen/nem" besorolás a `depends_on` és a kommentek alapján az én következtetésem; a repó nem mondja ki, mely szolgáltatások hagyhatók el.

### 1.4 Minimális CPU, RAM, lemez

- Kifejezett minimum CPU / RAM / lemez követelmény: **NOT FOUND** (rákerestem a `.md`, `.yaml`, `.yml`, `.toml` fájlokban a `minimum`, `RAM`, `memory`, `CPU`, `core`, `disk` kifejezésekre).
- Közvetett adatok a repóban:
  - Build közben 4 GB Node heap: `Dockerfile.dev:26`: `RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build` (ez a saját image építésére vonatkozik, a kész image letöltésére nem).
  - Elasticsearch heap: `docker-compose.yaml:189`: `ES_JAVA_OPTS=-Xms256m -Xmx256m`.
  - Elasticsearch lemez vízjelek: `docker-compose.yaml:185-187` (`watermark.low=512mb`, `high=256mb`, `flood_stage=128mb`).
- **2 magos, GPU nélküli Linux szerver?** A repó erről nem nyilatkozik: **NOT FOUND**. Tények a kódból: GPU-t semmi nem igényel helyben; az egyetlen GPU-s funkció (videóvágás) külső RunPod végpontra küldi a munkát (`.env.example:27-33`: `clip jobs to the GPU endpoint of postiz-uploader`), és alapból ki van kapcsolva. Hogy 2 mag és mennyi RAM elég 9 konténerhez (köztük Elasticsearch és 3 Node folyamat), azt a repó nem mondja meg.

---

## 2. Kimenő adatforgalom

### 2.1 Telemetria és analitika

**Sentry (backend és frontend)**
- `libraries/nestjs-libraries/src/sentry/initialize.sentry.ts:29-31`:
  ```ts
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return null;
  }
  ```
- `libraries/nestjs-libraries/src/sentry/initialize.sentry.ts:47`: `dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,`
- Ha be van kapcsolva, küldi: user id és e-mail (`initialize.sentry.ts:12-15`), szervezet id, Stripe customer id (`:20-21`: `Sentry.setTag('stripe.customer_id', params.paymentId);`), konzol logok minden szinten (`:52`), profilozás. Az OpenAI hívások prompt/válasz nélkül (`:54-57`: `recordInputs: false`, `recordOutputs: false`).
- Frontend: `apps/frontend/src/components/layout/sentry.component.tsx:11-13`: `if (!dsn) { return; }`. Bekapcsolva session replay is fut (`libraries/react-shared-libraries/src/sentry/initialize.sentry.client.ts:36-40`, maszkolt szöveggel), `replaysSessionSampleRate: 0.5` (`:47`).
- Alapállapot: **KI**. A Compose fájlban a változó ki van kommentezve (`docker-compose.yaml:89`: `# NEXT_PUBLIC_SENTRY_DSN: 'http://spotlight:8969/stream'`), és ha bekapcsolják, akkor is a helyi Spotlight konténerre mutat. Kikapcsolás: `NEXT_PUBLIC_SENTRY_DSN` üresen hagyása.
- Az image build csak `NEXT_PUBLIC_VERSION` build argumentumot kap (`.github/workflows/build-containers.yml:55`), tehát Sentry DSN nincs beégetve az image-be (a workflow alapján).

**Plausible (frontend)**
- `apps/frontend/src/app/(app)/layout.tsx:30-32`:
  ```ts
  const Plausible = !!process.env.STRIPE_PUBLISHABLE_KEY
    ? PlausibleProvider
    : Fragment;
  ```
- `layout.tsx:103-105`: `domain={!!process.env.IS_GENERAL ? 'postiz.com' : 'gitroom.com'}`. Eseményküldés: `libraries/helpers/src/utils/use.fire.events.ts:15`: `plausible(name, { props });`
- Alapállapot: **KI** (csak ha `STRIPE_PUBLISHABLE_KEY` be van állítva). Figyelem: ha valaki Stripe-ot állít be, a látogatási adatok a `postiz.com` domain nevében mennek a Plausible-hez. Kikapcsolás: `STRIPE_PUBLISHABLE_KEY` üresen hagyása; külön kapcsoló nincs (NOT FOUND).

**Dub Analytics (frontend)**
- `apps/frontend/src/app/(app)/layout.tsx:70`: `dub={!!process.env.STRIPE_PUBLISHABLE_KEY}`
- `apps/frontend/src/components/layout/dubAnalytics.tsx:9-15`: `if (!dub) return null;` majd `refer: 'postiz.pro'`.
- Alapállapot: **KI**. Kikapcsolás: `STRIPE_PUBLISHABLE_KEY` üresen.

**Datafast (frontend script és backend goal)**
- `apps/frontend/src/app/(app)/layout.tsx:37-41`: `{!!process.env.DATAFAST_WEBSITE_ID && (` ... `src="https://datafa.st/js/script.js"`
- `apps/backend/src/services/auth/auth.service.ts:200-202`: `if (email && datafast_visitor_id && process.env.DATAFAST_API_KEY) {` ... `await fetch('https://datafa.st/api/v1/goals', {` és a body-ban `metadata: { email }` (`:211-213`).
- Alapállapot: **KI**. Kikapcsolás: `DATAFAST_WEBSITE_ID` és `DATAFAST_API_KEY` üresen.

**Facebook Pixel és Conversions API**
- Frontend: `apps/frontend/src/components/layout/facebook.component.tsx:5-7`: `if (!process.env.NEXT_PUBLIC_FACEBOOK_PIXEL) { return null; }`. A pixel kód helyi másolatból töltődik (`'/f.js'`, `:17`), de az a fájl maga a `connect.facebook.net`-re hivatkozik (`apps/frontend/public/f.js:3281`: `CDN_BASE_URL: 'https://connect.facebook.net/',`).
- Backend: `libraries/nestjs-libraries/src/track/track.service.ts:39-45`:
  ```ts
  const accessToken = process.env.FACEBOOK_PIXEL_ACCESS_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL;
  ```
  és `if (!accessToken || !pixelId || !userAgent) { return; }`. Bekapcsolva a `graph.facebook.com/.../events` címre küldi: IP, user agent, SHA-256 hash-elt e-mail (`:66-70`).
- Alapállapot: **KI**. Kikapcsolás: `NEXT_PUBLIC_FACEBOOK_PIXEL` és `FACEBOOK_PIXEL_ACCESS_TOKEN` üresen.

**Google Tag Manager / Google Ads**
- `apps/frontend/src/components/layout/gtm.component.tsx:40-42`: `if (!gtmId) { return null; }`; `layout.tsx:102`: `gtmId={process.env.NEXT_PUBLIC_GTM_ID}`.
- Build időben: `apps/frontend/scripts/fetch-gtm.mjs:30-35`: ha nincs `NEXT_PUBLIC_GTM_ID`, kihagyja, egyébként letölti `https://www.googletagmanager.com/gtm.js?id=...`. Ez a frontend `postinstall` lépése (`apps/frontend/package.json:9`).
- Alapállapot: **KI**. Kikapcsolás: `NEXT_PUBLIC_GTM_ID` üresen.

**Chatbase (támogatási chat widget)**
- `apps/frontend/src/app/(app)/layout.tsx:58`: `isChatBase={!!process.env.CHATBASE_TOKEN}`; `apps/frontend/src/components/layout/chatbase.component.tsx:77`: `script.src = 'https://www.chatbase.co/embed.min.js';`
- Alapállapot: **KI**. Kikapcsolás: `CHATBASE_TOKEN` üresen.

**Sentry build plugin telemetria:** `apps/frontend/next.config.js:99`: `telemetry: false,` (a Sentry Next.js konfigurációjában). A Next.js saját telemetriájának (`NEXT_TELEMETRY_DISABLED`) kikapcsolása: NOT FOUND.

**Harmadik féltől származó függőségek (csak a lockfile alapján, a kódjuk nincs a repóban):**
- `pnpm-lock.yaml`: `@copilotkit/runtime@1.72.0` és `@copilotkit/shared@1.72.0` függősége `@segment/analytics-node: 2.3.0`, és `@scarf/scarf: 1.4.0`.
- `pnpm-lock.yaml`: `@mastra/core@1.67.0` függősége `posthog-node`.
- `pnpm-lock.yaml:38100` környéke: `swagger-ui-dist@5.32.13` függősége `@scarf/scarf`.
- Hogy ezek futásidőben ténylegesen küldenek-e adatot, és milyen változóval kapcsolhatók ki, a repóból NEM állapítható meg (a repóban nincs `COPILOTKIT_TELEMETRY_DISABLED`, `SCARF_ANALYTICS`, `DO_NOT_TRACK` beállítás: rákerestem, NOT FOUND). Lásd 8. pont.

### 2.2 AI szolgáltatók

- OpenAI kliens placeholder kulccsal: `libraries/nestjs-libraries/src/openai/openai.service.ts:8`: `apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',` (ugyanígy `agent/agent.graph.service.ts:26`, `:32`, `agent/agent.graph.insert.service.ts:12`, `database/prisma/autopost/autopost.service.ts:39`, `:45`).
- A Copilot végpontok kulcs nélkül nem indulnak: `apps/backend/src/api/routes/copilot.controller.ts:50-56`: `process.env.OPENAI_API_KEY === undefined || process.env.OPENAI_API_KEY === ''` esetén `Logger.warn('OpenAI API key not set, chat functionality will not work'); return;`. Modell: `model: 'gpt-4.1',` (`:63`).
- Küldött adat: a felhasználó által AI funkciónak átadott szöveg (posztszöveg, prompt).
- Alapállapot: **KI** (Compose: `docker-compose.yaml:93`: `OPENAI_API_KEY: ''`). Kikapcsolás: `OPENAI_API_KEY` üresen. Megjegyzés: a többi OpenAI-hívó szolgáltatásnál (`openai.service.ts`, `autopost.service.ts`) nem találtam ugyanilyen előzetes kulcsellenőrzést; hogy üres kulccsal is elindul-e egy (sikertelen) hívás az `api.openai.com` felé, azt nem ellenőriztem futtatással.
- Anthropic: a kódban nincs közvetlen Anthropic API hívás (`anthropic` keresés: NOT FOUND a backend/frontend kódban; a README csak MCP kliensként említi a Claude-ot).
- Egyéb AI / média szolgáltatók, mind csak kulccsal:
  - fal.ai: `libraries/nestjs-libraries/src/openai/fal.service.ts:14`: ``fetch(`https://fal.run/fal-ai/${model}`, {``, kulcs: `FAL_KEY` (`:17`).
  - EvoLink (Seedance videó): `libraries/nestjs-libraries/src/videos/seedance/seedance.ts:36`: `available: !!process.env.EVOLINK_API_KEY,`
  - ElevenLabs, Transloadit: `libraries/nestjs-libraries/src/videos/images-slides/images.slides.ts:66-69`: `!!process.env.TRANSLOADIT_AUTH && !!process.env.TRANSLOADIT_SECRET && !!process.env.OPENAI_API_KEY && !!process.env.FAL_KEY,`
  - HeyGen: `libraries/nestjs-libraries/src/3rdparties/heygen/heygen.provider.ts:29` (felhasználó által megadott kulccsal).
  - Deepgram: `libraries/nestjs-libraries/src/deepgram/deepgram.service.ts:11`, `DEEPGRAM_API_KEY`.
  - RunPod: `libraries/nestjs-libraries/src/upload/upload.factory.ts:37-39`: `process.env.STORAGE_PROVIDER === 'cloudflare' && !!process.env.RUNPOD_API_KEY && !!process.env.RUNPOD_ENDPOINT_ID`.

### 2.3 Fizetés

- `libraries/nestjs-libraries/src/services/stripe.service.ts:23`: `const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_nothing');`
- A fizetési logika kulcshoz kötött, pl. `apps/orchestrator/src/activities/post.activity.ts:157`: `if (process.env.STRIPE_SECRET_KEY) {` és `apps/backend/src/services/auth/public.auth.middleware.ts:60`: `if (!!process.env.STRIPE_SECRET_KEY && !org.subscription) {`.
- RevenueCat: `libraries/nestjs-libraries/src/services/payment/providers/revenuecat.provider.ts:127` (`api.revenuecat.com`), `REVENUECAT_SECRET_KEY`.
- Alapállapot: **KI** (`docker-compose.yaml:102-105` üres értékek). Megjegyzés: `FEE_AMOUNT: 0.05` alapból be van állítva (`docker-compose.yaml:101`), de Stripe kulcs nélkül nincs fizetés.

### 2.4 E-mail

- `libraries/nestjs-libraries/src/services/email.service.ts:14`: `this.emailService = this.selectProvider(process.env.EMAIL_PROVIDER!);`, és `:28-35`: `'resend'` esetén Resend, `'nodemailer'` esetén SMTP, egyébként `EmptyProvider`.
- Resend: `libraries/nestjs-libraries/src/emails/resend.provider.ts:4`: `const resend = new Resend(process.env.RESEND_API_KEY || 're_132');`
- Küldött adat: címzett e-mail, tárgy, HTML tartalom (értesítések, aktiválás, jelszó visszaállítás).
- Alapállapot: **KI** (`EMAIL_PROVIDER` nincs a Compose fájlban). Kikapcsolás: `EMAIL_PROVIDER` üresen.
- **Ellentmondás (DOKS kontra KÓD):** `.env.example:38-39`: `## If this variable exists, user activation is required.` / `## If it is commented out, users are activated automatically.` (a `RESEND_API_KEY`-re). A kód szerint viszont az aktiválást a `hasProvider()` dönti el, ami az `EMAIL_PROVIDER` változótól függ: `apps/backend/src/api/routes/auth.controller.ts:69`: `body.provider === 'LOCAL' && this._emailService.hasProvider();`. A `RESEND_API_KEY` önmagában tehát nem kapcsolja be az aktiválást.

### 2.5 Tárhely (storage)

- `libraries/nestjs-libraries/src/upload/upload.factory.ts:15`: `const storageProvider = process.env.STORAGE_PROVIDER || 'local';`
- Compose alapérték: `docker-compose.yaml:20`: `STORAGE_PROVIDER: 'local'`; a Cloudflare R2 blokk ki van kommentezve (`:25-31`).
- Alapállapot: **KI** (helyi tárolás a `postiz-uploads` kötetben). Bekapcsolás: `STORAGE_PROVIDER: 'cloudflare'` és `CLOUDFLARE_*`.
- **Ellentmondás (DOKS kontra KÓD):** `.env.example:15`: `## Cloudflare is currently required to save things like social media avatars for accounts.` Ezzel szemben a kód alapértéke `local`, és az avatar mentés a beállított storage-ra megy: `libraries/nestjs-libraries/src/database/prisma/integrations/integration.service.ts:116-122` (`await this.storage.uploadSimple(picture)`).
- AWS S3 közvetlen használat: a kódban `STORAGE_PROVIDER` csak `local` vagy `cloudflare` lehet (`apps/frontend/src/app/(app)/layout.tsx:52`: `process.env.STORAGE_PROVIDER! as 'local' | 'cloudflare'`). S3 mint önálló opció: NOT FOUND.

### 2.6 Rövid link szolgáltatók

- Dub: `libraries/nestjs-libraries/src/short-linking/providers/dub.ts:3`: `const DUB_API_ENDPOINT = process.env.DUB_API_ENDPOINT || 'https://api.dub.co';`; Short.io: `short-linking/providers/short.io.ts:5`; Kutt, LinkDrip.
- Alapállapot: **KI** (a Compose-ban mind ki van kommentezve, `docker-compose.yaml:111-121`). Csak token megadásával és a poszt `shortLink` opciójával aktív.

### 2.7 OAuth átirányítás harmadik félen keresztül (redirectmeto.com): ALAPBÓL ÉRINTHETI A TELEPÍTÉST

- Több provider, ha a `FRONTEND_URL` nem `https`, a visszahívási URL-t a `redirectmeto.com` szolgáltatáson keresztül adja meg a platformnak. Példa: `libraries/nestjs-libraries/src/integrations/social/instagram.standalone.provider.ts:119-122`:
  ```ts
  process?.env.FRONTEND_URL?.indexOf('https') == -1
    ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
    : `${process?.env.FRONTEND_URL}`
  ```
- Ugyanez: `threads.provider.ts:122`, `vk.provider.ts:102`, `tiktok.provider.ts:351`, `tiktok.business.provider.ts:67`, `slack.provider.ts:73`, valamint az Apple bejelentkezés: `apps/backend/src/services/auth/providers/apple.provider.ts:32`.
- Küldött adat: a böngésző az OAuth `code` és `state` paraméterrel a `redirectmeto.com` címen keresztül tér vissza, így ez a harmadik fél látja az autorizációs kódot.
- Alapállapot: a Compose alapértéke `FRONTEND_URL: 'http://localhost:4007'` (`docker-compose.yaml:9`), tehát **http, vagyis ezeknél a providereknél BE**. Kikapcsolás: `https://` kezdetű `FRONTEND_URL`. Külön kapcsoló: NOT FOUND.
- A vizsgált négy platformból ez csak az **Instagram (Standalone)** változatot érinti; a Facebook, Instagram (Facebook Business), LinkedIn és YouTube provider közvetlenül a `FRONTEND_URL`-t használja (lásd 4. pont).

### 2.8 Egyéb

- A Postiz Cloud felé küldés self-host esetén: NOT FOUND az alkalmazás kódjában. A `MCP_SELF_HOSTED_RELAY` a `.env.example:148-152` szerint `Postiz Cloud only` és `Leave unset on self-hosted installs`.
- Frissítés ellenőrzés (update check): NOT FOUND (`releases/latest`, `checkForUpdate`, `version.txt` lekérdezés keresése).
- A kimenő webhookokat a felhasználó állítja be, a cél URL-re a poszt adatai mennek: `apps/orchestrator/src/activities/post.activity.ts:536-541` (`await fetch(webhook.url, {` ... `body: JSON.stringify(post),`).
- Konténer induláskor: `package.json:34`: `"prisma-db-push": "pnpm dlx prisma@6.5.0 db push ..."`. A `pnpm dlx` a csomagot a registryből tölti le, ha nincs gyorsítótárban; hogy az image-ben előre ott van-e, nem ellenőriztem (lásd 8. pont).
- A Spotlight konténer `pull_policy: always` (`docker-compose.yaml:169`), azaz minden indításkor a `ghcr.io`-hoz fordul.
- A közösségi platformok API-jai (graph.facebook.com, api.linkedin.com, googleapis.com stb.) természetesen kapnak adatot, de csak akkor, ha a felhasználó csatornát köt be és posztol.

### 2.9 Összesítő táblázat

| Szolgáltatás | Mi megy ki | Alapból | Hogyan kapcsolható ki |
|---|---|---|---|
| Sentry (backend + frontend) | hibák, logok, trace, user id, e-mail, org id, Stripe customer id, session replay | KI | `NEXT_PUBLIC_SENTRY_DSN` üres |
| Plausible | oldalmegtekintés, események (`postiz.com` domain alatt) | KI | `STRIPE_PUBLISHABLE_KEY` üres |
| Dub Analytics | kattintás/hivatkozás követés | KI | `STRIPE_PUBLISHABLE_KEY` üres |
| Datafast | látogatás; regisztrációkor e-mail | KI | `DATAFAST_WEBSITE_ID`, `DATAFAST_API_KEY` üres |
| Facebook Pixel + Conversions API | események, IP, user agent, hash-elt e-mail | KI | `NEXT_PUBLIC_FACEBOOK_PIXEL`, `FACEBOOK_PIXEL_ACCESS_TOKEN` üres |
| Google Tag Manager / Ads | konverziós események | KI | `NEXT_PUBLIC_GTM_ID` üres |
| Chatbase | chat widget, azonosító token | KI | `CHATBASE_TOKEN` üres |
| OpenAI | AI-nak átadott szöveg | KI | `OPENAI_API_KEY` üres |
| fal.ai, EvoLink, ElevenLabs, Transloadit, HeyGen, Deepgram, RunPod | képek, videók, hang, szöveg | KI | a megfelelő `*_KEY` / `*_API_KEY` üres |
| Stripe, RevenueCat | számlázási adatok | KI | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `REVENUECAT_SECRET_KEY` üres |
| Resend / SMTP | e-mail cím, tárgy, tartalom | KI | `EMAIL_PROVIDER` üres |
| Cloudflare R2 | feltöltött médiák, avatarok | KI | `STORAGE_PROVIDER=local` |
| Dub, Short.io, Kutt, LinkDrip | rövidítendő linkek | KI | tokenek üresen |
| redirectmeto.com | OAuth `code` és `state` (Instagram Standalone, Threads, TikTok, Slack, VK, Apple login) | **BE, ha `FRONTEND_URL` http** | `https://` `FRONTEND_URL` |
| CopilotKit (Segment, Scarf), Mastra (PostHog) | nem állapítható meg a repóból | nem állapítható meg | NOT FOUND |
| npm registry (`pnpm dlx prisma`) | csomagletöltés indításkor (ha nincs cache) | valószínűleg BE, nem ellenőrzött | NOT FOUND |
| ghcr.io (Spotlight `pull_policy: always`) | image letöltés | BE, ha a Spotlight fut | a `spotlight` szolgáltatás törlése a Compose-ból |

**DOKS állítás ehhez képest:** `README.md:158`: `Runs on your own server; data never leaves your environment`. A kód alapján ez alapbeállítással nagyrészt igaz, kivéve a `redirectmeto.com` átirányítást http-s `FRONTEND_URL` esetén, a nem ellenőrizhető függőségi telemetriát, és természetesen a bekötött platformokat.

---

## 3. A bekötött fiókok tárolt adatai

### 3.1 Tábla és oszlopok

`libraries/nestjs-libraries/src/database/prisma/schema.prisma:368-380`:
```prisma
model Integration {
  ...
  token                 String
  ...
  tokenExpiration       DateTime?
  refreshToken          String?
```
és `:388`: `customInstanceDetails String?`.

### 3.2 Titkosítva vagy nyílt szövegként?

**KÓD: az access token és a refresh token NYÍLT SZÖVEGKÉNT kerül az adatbázisba.**

- A callback a platformtól kapott `accessToken` és `refreshToken` értéket változtatás nélkül adja tovább: `apps/backend/src/api/routes/no.auth.integrations.controller.ts:243-254`:
  ```ts
  await this._integrationService.createOrUpdateIntegration(
    ...
    accessToken,
    refreshToken,
  ```
- A service sem alakítja át (`libraries/nestjs-libraries/src/database/prisma/integrations/integration.service.ts:125-135`), a repository pedig közvetlenül írja: `libraries/nestjs-libraries/src/database/prisma/integrations/integration.repository.ts:356`: `token,` és `:360`: `refreshToken,` (create), valamint `:388`: `token,` és `:390`: `...(refreshToken ? { refreshToken } : {}),` (update).
- A Prisma kliensen nincs titkosító middleware vagy extension (`libraries/nestjs-libraries/src/database/prisma/prisma.service.ts`: `$use` / `$extends` NOT FOUND).

### 3.3 Ami titkosítva van

- Csak a `customInstanceDetails` (pl. saját példány URL és kulcs, egyedi mezők): `no.auth.integrations.controller.ts:260-262`: `details ? AuthService.fixedEncryption(details)`.
- Ezen felül az OAuth/MCP alkalmazás titkok és az API kulcsok (`libraries/nestjs-libraries/src/database/prisma/oauth/oauth.service.ts:97`: `const encryptedSecret = AuthService.fixedEncryption(clientSecret);`).

### 3.4 Kulcs és algoritmus

`libraries/helpers/src/auth/auth.service.ts:6`: `const algorithm = 'aes-256-cbc';`, `:14`: `const { key, iv } = EVP_BytesToKey(pass, null, keyLength * 8, ivLength, 'md5');`, `:30`: `const { key, iv } = deriveLegacyKeyIv(process.env.JWT_SECRET);`

- A kulcs a **`JWT_SECRET`** környezeti változóból származik (ugyanaz, amivel a bejelentkezési JWT-ket is aláírja: `auth.service.ts:43`: `return sign(value, process.env.JWT_SECRET!);`).
- Az IV is a `JWT_SECRET`-ből, rögzítetten származik (só nélkül, MD5 alapú kulcsszármaztatás), tehát ugyanaz a nyílt szöveg mindig ugyanazt a rejtjelezett szöveget adja (determinisztikus).
- A `JWT_SECRET` forrása: a Compose fájl, `docker-compose.yaml:11` (lásd 7. pont a placeholder értékről).
- Következmény (az én következtetésem a kódból): a `JWT_SECRET` megváltoztatása után a korábban titkosított mezők nem fejthetők vissza.

### 3.5 Fiók törlésekor

`integration.repository.ts:834-835`: `createHash('md5').update(value).digest('hex');` és `:867-870`: a `token` és `refreshToken` MD5 hash-re cserélődik.

### 3.6 DOKS kontra KÓD

`README.md:186`: `Postiz does not collect, store, or proxy API keys or access tokens from users.` A mondat a `## Postiz Compliance` szakaszban áll (`README.md:181`), amely felváltva beszél a self-hosted kiadásról (`README.md:183`) és a hosztolt szolgáltatásról (`README.md:184`), így nem egyértelmű, melyikre vonatkozik. A kód viszont ugyanúgy, a self-hosted példányban is eltárolja az access tokeneket (nyíltan) a saját adatbázisban, ami nélkül az ütemezett posztolás nem is működhetne.

---

## 4. A négy platform

Közös: minden provider a `libraries/nestjs-libraries/src/integrations/social/` mappában van. Az ütemezés nem a platform funkciója: a Postiz a saját Temporal workflow-jával a megadott időpontban hívja a `post()` metódust (`CLAUDE.md`: `they will be added into a workflow and posted at the right time`). A `comment()` metódusok a saját poszt alá írnak további kommenteket (szál/első komment), nem bejövő kommentek kezelésére szolgálnak.

Fontos KÓD tény a médiához: a Facebook és Instagram a médiát URL alapján tölti le a Postiz példányról (`facebook.provider.ts:850`: `file_url: firstPost?.media?.[0]?.path!,`; `instagram.provider.ts:761-775`: `video_url=${m.path}`, `image_url=${m.path}`), ezért a médiafájloknak nyilvánosan elérhetőnek kell lenniük az internetről.

### 4.1 Facebook (`facebook.provider.ts`, identifier `facebook`, név `Facebook Page`)

- Környezeti változók: `FACEBOOK_APP_ID` (`:307`), `FACEBOOK_APP_SECRET` (`:350`), `FRONTEND_URL` (`:309`).
- Scope-ok, `facebook.provider.ts:36-43`:
  ```ts
  scopes = [
    'pages_show_list',
    'business_management',
    'pages_manage_posts',
    'pages_manage_engagement',
    'pages_read_engagement',
    'read_insights',
  ];
  ```
- Redirect: `${process.env.FRONTEND_URL}/integrations/social/facebook` (`:308-310`), redirectmeto nélkül.
- Képességek:
  - Szöveg, fotó, videó: `:30`: `"Facebook posts can be text only, or include photos or a video. ...`
  - Story (fotó és videó): DTO `libraries/nestjs-libraries/src/dtos/posts/providers-settings/facebook.dto.ts:102-104`: `@IsIn(['post', 'story'])`; `facebook.provider.ts:583` (`video_stories`), `:607` (`photos`).
  - Reels: külön Reels feltöltés NOT FOUND. A videó a `/videos` végpontra megy (`:843`), majd a link `reel` formában készül: `:862`: `finalUrl = 'https://www.facebook.com/reel/' + videoId;`. Hogy ebből a Facebook Reel-t vagy sima videót csinál, a repóból nem dönthető el.
  - Komment: `comment()` (`:989`).
  - Analitika: `analytics()` (`:1029`), `postAnalytics()` (`:1086`).
  - Csak Facebook oldalra (Page) posztol, `pages()` (`:394`); személyes profilra posztolás: NOT FOUND.

### 4.2 Instagram

Két külön provider van.

**a) `instagram.provider.ts`, identifier `instagram`, név `Instagram\n(Facebook Business)`**
- Környezeti változók: `FACEBOOK_APP_ID` (`:482`), `FACEBOOK_APP_SECRET` (`:507`), `FRONTEND_URL` (`:484`). (Ugyanaz a Meta app, mint a Facebooknál.)
- Scope-ok, `instagram.provider.ts:37-45`:
  ```ts
  scopes = [
    'instagram_basic',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
  ];
  ```
- Redirect: `${process.env.FRONTEND_URL}/integrations/social/instagram` (`:483-485`).
- Képességek: fotó, videó (`media_type=VIDEO`, `:771`), Reels (`media_type=REELS`, `:763-766`), Story (`media_type=STORIES`, `:761`, `:775`), karusszel 2-10 elem (`:424`), Trial Reels (`:63-71`), társszerzők (`collaborators`, DTO `instagram.dto.ts:67`), zene keresés Reelshez (`audioSearch`, `:1267`), komment (`:1107`), analitika (`:1191`, `:1298`). DTO: `instagram.dto.ts:52-54`: `@IsIn(['post', 'story'])`.

**b) `instagram.standalone.provider.ts`, identifier `instagram-standalone`, név `Instagram\n(Standalone)`**
- Környezeti változók: `INSTAGRAM_APP_ID` (`:116`), `INSTAGRAM_APP_SECRET` (`:138`). Ezek a `.env.example`-ben és a `docker-compose.yaml`-ben NEM szerepelnek (rákerestem: NOT FOUND).
- Scope-ok, `instagram.standalone.provider.ts:32-37`:
  ```ts
  scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_comments',
    'instagram_business_manage_insights',
  ];
  ```
- Redirect: http-s `FRONTEND_URL` esetén `redirectmeto.com`-on keresztül (`:119-122`, lásd 2.7).
- Képességek: `post()` (`:186`), `comment()` (`:237`), `analytics()` (`:256`), `postAnalytics()` (`:265`).

### 4.3 LinkedIn

Két provider: `linkedin.provider.ts` (identifier `linkedin`, személyes profil) és `linkedin.page.provider.ts` (identifier `linkedin-page`, céges oldal). Mindkettő ugyanazt a LinkedIn appot használja.

- Környezeti változók: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` (`linkedin.provider.ts:145-146`, `linkedin.page.provider.ts:57-58`), `FRONTEND_URL`.
- Scope-ok, `linkedin.provider.ts:66-74` (a `linkedin.page.provider.ts:29-37` szó szerint ugyanez):
  ```ts
  scopes = [
    'openid',
    'profile',
    'w_member_social',
    'r_basicprofile',
    'rw_organization_admin',
    'w_organization_social',
    'r_organization_social',
  ];
  ```
- Redirect: `${process.env.FRONTEND_URL}/integrations/social/linkedin` (`linkedin.provider.ts:188`), illetve `/integrations/social/linkedin-page` (`linkedin.page.provider.ts:130`), redirectmeto nélkül.
- Képességek: szöveg, kép, videó (`endpoint = 'videos'`, `linkedin.provider.ts:318-319`), PDF dokumentum (`:320-321`), képekből PDF karusszel (`convertImagesToPdfCarousel`, `:533`; feltétel: `:94`: `'Carousel can only be created with 2 or more images and no videos.'`), komment (`:1105`, `:1141`), megosztás (`repostPostUsers`, `:1175`), megemlítés (`mention`, `:1217`).
- Analitika: csak a céges oldal providerben: `linkedin.page.provider.ts:322` (`analytics`), `:447` (`postAnalytics`). A személyes `linkedin.provider.ts`-ben `analytics` előfordulás: 0.
- Automatikus "plug" funkciók a céges oldalhoz: `autoRepostPost` (`linkedin.page.provider.ts:589`), `autoPlugPost` (`:667`).

### 4.4 YouTube (`youtube.provider.ts`, identifier `youtube`)

- Környezeti változók: `YOUTUBE_CLIENT_ID` (`:32`), `YOUTUBE_CLIENT_SECRET` (`:33`), `FRONTEND_URL` (`:34`).
- Scope-ok, `youtube.provider.ts:65-74`:
  ```ts
  scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtubepartner',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ];
  ```
- Redirect: `${process.env.FRONTEND_URL}/integrations/social/youtube` (`:34`, `:316`), `access_type: 'offline'`, `prompt: 'consent'` (`:313-314`).
- Képességek: videó feltöltés címmel, láthatósággal és gyerekeknek szóló jelöléssel: DTO `libraries/nestjs-libraries/src/dtos/posts/providers-settings/youtube.settings.dto.ts:71-79`: `title`, `@IsIn(['public', 'private', 'unlisted'])`, `@IsIn(['yes', 'no'])` `selfDeclaredMadeForKids`; bélyegkép (`thumbnail`, DTO `:84`; feltöltés: `youtube.provider.ts:842`: `youtubeClient.thumbnails.set({`), címkék (`:616-617`), analitika (`:941`, `:1029`). Komment metódus: NOT FOUND.
- Shorts: külön Shorts kezelés NOT FOUND (a `short`, `#shorts`, `vertical` keresés a fájlban nem adott releváns találatot).

### 4.5 Platform app review és üzleti ellenőrzés

- **DOKS:** `README.md:159`: `You create your own developer apps on each platform and go through their approval (Meta, YouTube, TikTok can take weeks)`.
- Részletes leírás arról, melyik scope milyen Meta App Review, Google OAuth verification vagy LinkedIn termék (pl. Community Management API) jóváhagyást igényel: **NOT FOUND** a repóban. A README ezt a docs.postiz.com oldalra hagyja.
- Business verification: **NOT FOUND**.

---

## 5. Licenc

### 5.1 A licencfájl

- Fájlnév: `LICENSE`. Típus: `LICENSE:1-2`: `GNU AFFERO GENERAL PUBLIC LICENSE` / `Version 3, 19 November 2007`.
- `README.md:192`: `This repository's source code is available under the [AGPL-3.0 license](LICENSE).`
- Nem jogi tanácsadás; az alábbi a licencszöveg közérthető összefoglalása.

### 5.2 Mit követel meg az AGPL-3.0

**(a) Csak belső használat a tulajdonos által, módosítás nélkül**
- `LICENSE` 2. pont: `This License explicitly affirms your unlimited permission to run the unmodified Program.`
- Ugyanott: `You may make, run and propagate covered works that you do not convey, without conditions so long as your license otherwise remains in force.`
- Közérthetően: a módosítatlan program saját célra futtatása feltétel nélkül megengedett, nincs forráskód-közzétételi kötelezettség.

**(b) Módosítás esetén**
- Saját célra módosítani és futtatni szabad (2. pont fenti mondata a "propagate" fogalmát is lefedi, amíg nincs "convey").
- Ha a módosított változatot másnak átadják (conveying), az 5. pont szerint: `a) The work must carry prominent notices stating that you modified it, and giving a relevant date.` és `c) You must license the entire work, as a whole, under this License to anyone who comes into possession of a copy.`
- Fogalom: `LICENSE` 0. pont: `Mere interaction with a user through a computer network, with no transfer of a copy, is not conveying.` Ezért a hálózati használatra a 13. pont külön szabályt ad (lásd c).

**(c) Ha mások hálózaton keresztül férnek hozzá**
- `LICENSE` 13. pont: `if you modify the Program, your modified version must prominently offer all users interacting with it remotely through a computer network (if your version supports such interaction) an opportunity to receive the Corresponding Source of your version by providing access to the Corresponding Source from a network server at no charge`.
- Közérthetően: ha a programot **módosították**, és más felhasználók (pl. ügyfelek, külső munkatársak) hálózaton keresztül használják, akkor nekik ingyen elérhetővé kell tenni a módosított változat teljes forráskódját. Módosítatlan változatnál ez a 13. pont szerinti kötelezettség nem áll fenn, de a 13. pont szövege csak a módosított változatra vonatkozik.

### 5.3 További feltételek, védjegy, kereskedelmi licenc

- `README.md:150`: `We do not "gate" features or limit the license.`
- Contributor License Agreement: `CCLA.md` és `ICLA.md` (FSFE Fiduciary License Agreement 2.1). `CCLA.md:49`: a hozzájáruló `exclusive, perpetual and irrevocable` licencet ad a Postiznak, `with the right to transfer an unlimited number of non-exclusive licenses or to grant sublicenses to third parties`. `CCLA.md:87`: `should We make available any Material under a non-free or non-open license, We must make a version of such Material available under a free and open license too.` Ez lehetővé teszi a Postiz számára az átlicencelést, de egy szabad változat fenntartását is előírja.
- Védjegy (trademark) szabályzat vagy megjegyzés: **NOT FOUND**.
- Kereskedelmi (commercial) licenc ajánlat: **NOT FOUND**.

---

## 6. Automatizálás

### 6.1 Public API (KÓD)

- Controller: `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts:64`: `@Controller('/public/v1')`.
- Fő végpontok: `POST /posts` (`:146`), `GET /posts` (`:133`), `DELETE /posts/:id` (`:233`), `DELETE /posts/group/:group` (`:243`), `POST /upload` (`:80`), `POST /upload-from-url` (`:103`), `GET /integrations` (`:320`), `GET /find-slot/:id` (`:124`), `GET /is-connected` (`:252`), plusz debug, értesítés, videó végpontok.
- Hitelesítés: `Authorization` fejléc (`apps/backend/src/services/auth/public.auth.middleware.ts:24-25`), szervezeti API kulccsal vagy OAuth tokennel (`:38`).
- Kéréskorlát: `apps/backend/src/app.module.ts:39`: `limit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 90,`; a Compose-ban `API_LIMIT: 30` (`docker-compose.yaml:98`); `.env.example:157`: `# The limit of the public API hour limit`.
- Elérés self-hostnál (következtetés az nginx konfigból, `var/docker/nginx.conf:20-21`): `<MAIN_URL>/api/public/v1/...`.
- Dokumentáció: a repóban NINCS, csak hivatkozás: `README.md` (`https://docs.postiz.com/public-api`), `apps/frontend/src/components/public-api/public.component.tsx:802`.
- A `libraries/plugins/src/list/public-api` git submodule (`.gitmodules`, `git@github.com:gitroomhq/public-api.git`) a klónban üres; tartalma nem vizsgálható.

### 6.2 Poszt létrehozása másik programból

Kérés törzse a `libraries/nestjs-libraries/src/dtos/posts/create.post.dto.ts` alapján: `type` (`:100`: `@IsIn(['draft', 'schedule', 'now', 'update'])`), `date`, `shortLink`, `tags`, `posts[]` (mindegyikben `integration.id`, `value[]` a `content` és `image` mezőkkel, valamint provider specifikus `settings`, `__type` diszkriminátorral). Vázlat (a mezőnevek a DTO-ból, a pontos formátumot élesben ellenőrizni kell):

```bash
curl -X POST "https://postiz.example.com/api/public/v1/posts" \
  -H "Authorization: <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"type":"schedule","date":"2026-11-02T09:00:00Z","shortLink":false,"tags":[],
       "posts":[{"integration":{"id":"<INTEGRATION_ID>"},
                 "value":[{"content":"Hello","image":[]}],
                 "settings":{"__type":"linkedin"}}]}'
```

NodeJS SDK: `apps/sdk/README.md`: `const postiz = new Postiz('your api key', 'your self-hosted instance (optional)');`, metódusok: `post`, `postList`, `upload`, `integrations`, `deletePost`. Az alapértelmezett cím a felhő: `apps/sdk/src/index.ts:18`: `private _path = 'https://api.postiz.com'`, ezért self-hostnál a második paramétert meg kell adni.

### 6.3 Webhookok

- Bejövő: `apps/backend/src/api/routes/webhooks.controller.ts:22`: `@Controller('/webhooks')`.
- Kimenő (posztolás után): `apps/orchestrator/src/activities/post.activity.ts:536-544`, POST JSON a felhasználó által megadott URL-re, SSRF védett dispatcherrel (`getSsrfSafeDispatcher()`).
- DOKS: `README.md:169`: `Public API & webhooks` ... `Included`.

### 6.4 MCP szerver

- `libraries/nestjs-libraries/src/chat/start.mcp.ts`: `/mcp` (`:394`), `/mcp/:id` (`:444`), OAuth változatok `/mcp-oauth`, `/mcp-oauth-claude`, `/mcp-oauth-chatgpt`, `/mcp-oauth-dynamic` (`:279-286`), `.well-known` végpontok (`:296`, `:310`, `:330`). Hitelesítés: `Bearer` token (`start.mcp.ts` 412. sor körül: `req.headers.authorization?.replace('Bearer ', '')`).
- Dinamikus kliens regisztráció korlátozása: `.env.example:139-147` (`DCR_VERIFIED_DOMAINS`).
- Dokumentáció: csak hivatkozás, `public.component.tsx:384`: `https://docs.postiz.com/mcp/introduction`.

### 6.5 CLI

- A repóban lévő `apps/commands` belső NestJS parancsokat tartalmaz (pl. `apps/commands/src/tasks/agent.run.ts:9`: `command: 'run:agent'`), nem felhasználói CLI-t.
- Felhasználói CLI: a kódja a repóban NOT FOUND; csak hivatkozás: `public.component.tsx:646`: `https://docs.postiz.com/cli/introduction`, és `README.md` (`https://postiz.com/agent`, `AI Agents CLI`).

### 6.6 n8n, Make, Zapier

- n8n: csak hivatkozás egy npm csomagra: `README.md` (`https://www.npmjs.com/package/n8n-nodes-postiz`), `public.component.tsx:810`. A node kódja a repóban: NOT FOUND.
- Make.com: csak hivatkozás (`README.md`: `https://apps.make.com/postiz`).
- Zapier: csak szöveges említés, `README.md:120`: `Perfect for automation (API) with platforms like N8N, Make.com, Zapier, etc.` Zapier integráció kódja vagy linkje: NOT FOUND.

---

## 7. Biztonság

### 7.1 SECURITY.md

- Hatókör (`SECURITY.md:9-16`): a `postiz-app` repó, a hivatalos `gitroomhq` komponensek, a GHCR image-ek, az `@postiz` npm csomagok, a Postiz Cloud. `SECURITY.md:18`: `Vulnerabilities in third-party dependencies or user-hosted infrastructure are outside of this scope.`
- Támogatott verzió: `SECURITY.md:22`: `This project currently only supports the latest release.`
- Nem számít sérülékenységnek többek között: `SECURITY.md:37`: `Misconfiguration or non-default changes on a self-hosted instance (exposed database, missing TLS, weak operator-set secrets)`. Viszont hatókörben van: `SECURITY.md:32`: `Insecure default configurations shipped by Postiz.`
- Bejelentés módja: `SECURITY.md:47`: `All security reports and related correspondence must be submitted through [GAdvisory](https://postiz.gadvisory.org/request)`. `SECURITY.md:56`: `Private vulnerability reporting on GitHub is disabled for our repositories.` Sürgős esetben e-mail: `SECURITY.md:69`: `contact@gplatform.org`.
- Határidők (`SECURITY.md:92-96`): visszaigazolás 72 órán belül, triázs 7 napon belül, kritikus javítás 90 napon belül, nem kritikus 180 napon belül.
- A Postiz CNA (CVE kiadó): `SECURITY.md:100`.

### 7.2 Alapértelmezett titkok és jelszavak, amelyeket cserélni kell

`docker-compose.yaml`:
- `:11`: `JWT_SECRET: 'random string that is unique to every install - just type random characters here!'` (ebből származik a tokenek aláírása ÉS a titkosítási kulcs is, lásd 3.4).
- `:12`: `DATABASE_URL: 'postgresql://postiz-user:postiz-password@postiz-postgres:5432/postiz-db-local'`
- `:141`: `POSTGRES_PASSWORD: postiz-password`
- `:202`: `POSTGRES_PASSWORD: temporal` és `:223`: `- POSTGRES_PWD=temporal`
- `:190`: `- xpack.security.enabled=false` (Elasticsearch hitelesítés nélkül; a port nincs kiengedve a hosztra).
- `:17`: `DISABLE_REGISTRATION: 'false'`: bárki regisztrálhat, aki eléri a felületet. A kód: `apps/backend/src/services/auth/auth.service.ts:24`: `process.env.DISABLE_REGISTRATION !== 'true' ||`; `true` esetén csak akkor engedi, ha még nincs szervezet (`:30`: `return (await this._organizationService.getCount()) === 0;`).
- Hosztra kiengedett, hitelesítés nélküli belső felületek: `temporal` `7233:7233` (`:213-214`), `temporal-ui` `8080:8080` (`:258-259`), `spotlight` `8969:8969` (`:171-172`). A Compose fájl ezekhez nem ad hitelesítést (a kódból következtetés; a Temporal UI saját hitelesítését nem vizsgáltam).

`.env.example`:
- `:4`: `DATABASE_URL="postgresql://postiz-user:postiz-password@localhost:5432/postiz-db-local"`
- `:6`: `JWT_SECRET="random string for your JWT secret, make it long"`
- `:40`: `#RESEND_API_KEY="RzeTwHijvxvPUerScFcenUZUALuQJzSaGSMJ"` (a `:37` sor szerint: `## This is a dummy key, you must create your own from Resend.`)

Kódba égetett tartalék értékek (nem titkok, de jelzik, hogy hiányzó kulccsal is példányosul a kliens): `stripe.service.ts:23` `'sk_nothing'`, `resend.provider.ts:4` `'re_132'`, `openai.service.ts:8` `'sk-proj-'`, `images.slides.ts:22-23` `'just empty text'`.

Alapértelmezett admin felhasználó: **NOT FOUND** (a fiók regisztrációval jön létre).

---

## 8. Nyitott kérdések (a repóból nem igazolható)

1. **Hardverigény:** minimum CPU, RAM, lemez, és hogy egy 2 magos szerver elég-e: NOT FOUND. Mérés nélkül nem dönthető el.
2. **Függőségi telemetria:** a `@copilotkit/runtime` és `@copilotkit/shared` (Segment, Scarf), a `@mastra/core` (PostHog) és a `swagger-ui-dist` (Scarf) futásidőben vagy telepítéskor küld-e adatot, és mivel kapcsolható ki. A repóban nincs erre vonatkozó beállítás; a csomagok forrását vagy egy futó példány hálózati forgalmát kellene megnézni.
3. **`pnpm dlx prisma@6.5.0` induláskor:** fordul-e minden konténerindításkor az npm registryhez, vagy az image-ben cache-elve van. A futó image vizsgálata kell hozzá.
4. **OpenAI üres kulccsal:** a Copilot végpontok ellenőrzik a kulcsot, más AI útvonalak (`openai.service.ts`, `autopost.service.ts`, agent) nem láthatóan; hogy üres kulccsal elindul-e kimenő hívás, futtatással kellene ellenőrizni.
5. **A hivatalos telepítési útmutató** (`https://docs.postiz.com/quickstart`) és a konfigurációs referencia (`.env.example:1`: `http://docs.postiz.com/configuration/reference`) tartalma a repón kívül van, nem vizsgáltam.
6. **Platform jóváhagyások:** melyik scope-hoz kell Meta App Review / Business Verification, Google OAuth verification (a `youtube` és `youtubepartner` scope-ok érzékenyek lehetnek), LinkedIn Community Management API hozzáférés. A repó csak általánosságban említi (`README.md:159`).
7. **Facebook Reels:** a videó a `/videos` végpontra megy, de a link `facebook.com/reel/` formátumú; hogy ez valódi Reel-ként jelenik-e meg, nem dönthető el.
8. **YouTube Shorts:** külön kezelés nincs; hogy egy függőleges, rövid videó a YouTube oldalán automatikusan Shorts-e lesz, az a YouTube viselkedésétől függ, nem a kódtól.
9. **`INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`:** a kód használja, de a `.env.example`-ben és a Compose fájlban nem szerepel; a dokumentált beállítási mód NOT FOUND.
10. **Public API pontos sémája** és a `libraries/plugins/src/list/public-api` submodule tartalma (privát vagy SSH-s URL, a klónban üres).
11. **Felhasználói CLI és n8n node** forráskódja nincs ebben a repóban.
12. **Tokenek titkosítása:** a repóban nincs olyan beállítás, amely az `Integration.token` / `refreshToken` oszlopot titkosítaná. Ha ez követelmény, adatbázis- vagy lemezszintű titkosítást kell alkalmazni; a repóban erre ajánlás: NOT FOUND.
13. **Temporal UI (8080) és Temporal (7233) hitelesítése** a megadott image verziókban: a Compose nem állít be hitelesítést, a temporalio image-ek alapviselkedését nem vizsgáltam.
