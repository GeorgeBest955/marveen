# Kutatási jelentés: anthropics/skills és Graphify-Labs/graphify

Készült: 2026-10-30. Minden állítás mellett ott a forrás (fájl vagy URL). Ahol valami nincs benne a repóban, ott NOT FOUND áll.

Vizsgált állapot:

- `https://github.com/anthropics/skills`, ág `main`, HEAD `ca45fc496a3436251f191354091d557da31c15b5` (2026-10-28)
- `https://github.com/Graphify-Labs/graphify`, ág `v8`, HEAD `0a8cd4e1e342235fe53e881fb5d591bf0460071f` (2026-10-27)

Klónozás (mindkettő sikeres volt):

```bash
git clone https://github.com/anthropics/skills
git clone https://github.com/Graphify-Labs/graphify
```

Az utolsó commit dátumát skillenként ezzel kérdeztem le (committer dátum, rövid hash):

```bash
git log -1 --format='%cs %h' -- skills/<name>/
```

---

## 1. rész: anthropics/skills

### Általános megjegyzések

- A `skills/` mappában 19 alkönyvtár van (`ls skills`).
- A repó gyökerében NINCS közös `LICENSE` fájl (gyökér tartalma: `README.md`, `THIRD_PARTY_NOTICES.md`, `skills`, `spec`, `template`). A licenc mappánként, a `LICENSE.txt` fájlban és a `SKILL.md` frontmatter `license:` mezőjében van megadva.
- A `README.md` szerint: "Many skills in this repo are open source (Apache 2.0)." és a `docx`, `pdf`, `pptx`, `xlsx` mappák "are source-available, not open source" (`README.md`).
- A `README.md` figyelmeztetése: "These skills are provided for demonstration and educational purposes only." (`README.md`, Disclaimer szakasz).
- Az Apache licencű mappák `LICENSE.txt` fájlja a 2-3. sorban: "Apache License" / "Version 2.0, January 2004", a 192. sorban: "Licensed under the Apache License, Version 2.0 (the "License");".
- A `docx`, `pdf`, `pptx`, `xlsx` mappák `LICENSE.txt` fájljai bájtra azonosak (`cmp` ellenőrzés), első sora: "© 2025 Anthropic, PBC. All rights reserved.", és többek között ezt tiltja: "Create derivative works based on these materials", "Distribute, sublicense, or transfer these materials to any third party", "Extract these materials from the Services or retain copies of these materials outside the Services".
- Fizetős API: minden skill a Claude-on belül fut, így maga a Claude használata (előfizetés vagy API) mindig feltétel. Az alábbi "Hálózat / fizetős API" sorok csak a skill SAJÁT, ezen felüli hálózati vagy API igényét jelzik.

Forrás URL minta: `https://github.com/anthropics/skills/blob/main/skills/<name>/SKILL.md`

---

### 1.1 academy-guide

- **Mit csinál:** Claude használatára vonatkozó kérdéseknél a válasz végére illő Claude Academy kurzust, tutorialt vagy use case-t ajánl. Csak erős egyezésnél ajánl, és tilos kitalált tartalmat ajánlania (`skills/academy-guide/SKILL.md`, "Only recommend on strong matches", "Never hallucinate content").
- **Bemenet / kimenet:** Bemenet: a felhasználó "how do I ..." típusú kérdése. Kimenet: a normál válasz plusz egy-két Academy link (`skills/academy-guide/SKILL.md`).
- **Függőségek:** Nincs szkript a mappában (csak `SKILL.md`, `LICENSE.txt`). URL-letöltési képesség kell a katalógushoz.
- **Hálózat / fizetős API:** Igen, hálózat: "The catalog is published as JSON at academy.claude.com/assets/data/catalog.json ... fetch that file once per conversation" (`skills/academy-guide/SKILL.md`, "The catalog" szakasz). Fizetős API: nem kell.
- **Licenc:** Apache 2.0. Idézet `skills/academy-guide/LICENSE.txt`: "Apache License / Version 2.0, January 2004"; `SKILL.md`: "license: Complete terms in LICENSE.txt".
- **Utolsó commit:** 2026-08-18 (`0a64e39`)
- **Példa kisvállalkozásnak:** Egy tartalomgyártó ügynökség új munkatársa megkérdezi, hogyan használja a Claude Projects funkciót, és a válasz mellé kap egy pontos Academy tutorial linket a betanításhoz.
- **Mikor NE:** Ha a felhasználó épp egy feladat közepén van és csak a kész munkát akarja, ne használd (a `SKILL.md` maga is ezt írja: "not when they are mid-task").

### 1.2 algorithmic-art

- **Mit csinál:** Generatív, algoritmikus művészetet készít p5.js-sel, seedelt véletlennel és interaktív paraméterekkel. Előbb egy "algoritmikus filozófiát" ír, majd azt kódban fejezi ki (`skills/algorithmic-art/SKILL.md`).
- **Bemenet / kimenet:** Bemenet: szöveges kérés (téma, hangulat). Kimenet: önálló HTML artifact p5.js kóddal, a `templates/viewer.html` és `templates/generator_template.js` alapján (`skills/algorithmic-art/templates/`).
- **Függőségek:** p5.js 1.7.0 CDN-ről; Google Fonts (Poppins, Lora). Python csomag vagy bináris: NOT FOUND.
- **Hálózat / fizetős API:** A megjelenítéshez hálózat kell: `<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>` (`skills/algorithmic-art/templates/viewer.html:23`) és `https://fonts.googleapis.com/...` (`viewer.html:26`). Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/algorithmic-art/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy podcast stúdió epizódonként egyedi, seed alapján reprodukálható absztrakt borítóháttért generál, a seedet az epizódszámhoz kötve.
- **Mikor NE:** Ha egy konkrét, létező művész stílusát kell lemásolni, ne használd (a `SKILL.md` kifejezetten tiltja: "rather than copying existing artists' work").

### 1.3 brand-guidelines

- **Mit csinál:** Az Anthropic hivatalos márkaszíneit és tipográfiáját alkalmazza artifactokra. Címsorokra Poppins, törzsszövegre Lora betűtípust ír elő (`skills/brand-guidelines/SKILL.md:34-35`).
- **Bemenet / kimenet:** Bemenet: egy formázandó artifact (dia, dokumentum, HTML). Kimenet: ugyanaz Anthropic színekkel és betűkkel.
- **Függőségek:** Nincs szkript. Poppins és Lora betűtípus, Arial/Georgia tartalékkal (`SKILL.md:42-44`).
- **Hálózat / fizetős API:** NOT FOUND (a `SKILL.md` nem ír elő hálózati hívást). Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/brand-guidelines/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Sablonként szolgál: a vállalkozás lemásolja a szerkezetét, és a saját márkaszíneit, betűit írja bele, így minden generált anyag egységes lesz.
- **Mikor NE:** Saját márkájú anyagnál változtatás nélkül ne használd, mert az Anthropic arculatát tenné rá a tartalomra.

### 1.4 canvas-design

- **Mit csinál:** Előbb egy vizuális "design filozófiát" fogalmaz meg, majd azt statikus képként (PNG vagy PDF) valósítja meg. Plakátokra, statikus művészi anyagokra való (`skills/canvas-design/SKILL.md`).
- **Bemenet / kimenet:** Bemenet: szöveges kérés. Kimenet: "a single, downloadable .pdf or .png file, alongside the design philosophy used as a .md file" (`SKILL.md:116`).
- **Függőségek:** A mappában 27 betűtípus van a `canvas-fonts/` alatt (OFL licenccel, pl. `canvas-fonts/Lora-OFL.txt`). A rajzoló Python könyvtár neve: NOT FOUND (a `SKILL.md` nem nevez meg könyvtárat).
- **Hálózat / fizetős API:** NOT FOUND (nincs hálózati utasítás). Fizetős API: nem.
- **Licenc:** Apache 2.0 a mappára. Idézet `skills/canvas-design/LICENSE.txt`: "Apache License / Version 2.0, January 2004". A betűtípusokra külön SIL OFL fájlok vonatkoznak (`skills/canvas-design/canvas-fonts/*-OFL.txt`).
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy kávézó havi koncertplakátját készíti el nyomtatható PDF-ben, egységes vizuális koncepció alapján.
- **Mikor NE:** Ha szerkeszthető, sokoldalas üzleti dokumentum kell (pl. ajánlat), ne ezt használd, hanem a `docx` vagy `pptx` skillt.

### 1.5 claude-api

- **Mit csinál:** Referencia a Claude API-hoz és az Anthropic SDK-hoz: modell azonosítók, árak, paraméterek, streaming, tool use, caching, migráció. 96 fájl, nyelvenkénti mappákkal (`csharp`, `curl`, `go`, `java`, `php`, `python`, `ruby`, `typescript`, `shared`) (`skills/claude-api/`).
- **Bemenet / kimenet:** Bemenet: Claude API-t használó kód vagy kérdés. Kimenet: helyes API kód, javaslat; a `drop_block_probe.py` JSON/szöveges riportot ad (`skills/claude-api/shared/preserved-thinking-migration/drop_block_probe.py`).
- **Függőségek:** A szkriptek: `drop_block_probe.py`, `prefix_diff.py` (Python, csak standard könyvtár: "Dependency-free (Python 3.8+, urllib only)", `drop_block_probe.py:5`), `runner-scaffold.mjs`, `build-report-lite.mjs` (Node) (`skills/claude-api/shared/evals/report/`). A generált kódhoz az adott nyelv Anthropic SDK-ja kell.
- **Hálózat / fizetős API:** Igen, mindkettő. `DEFAULT_BASE_URL = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")` (`drop_block_probe.py:133`), és `ANTHROPIC_API_KEY` kell (`drop_block_probe.py:410`). A self-test: "three tiny live requests (cents)" (`drop_block_probe.py:18`).
- **Licenc:** Apache 2.0. Idézet `skills/claude-api/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-10-09 (`dbd4588`)
- **Példa kisvállalkozásnak:** Egy kis kiadó saját szkriptet ír, amely a Claude API-val blogcikkekből automatikusan hírlevél-összefoglalót készít, a skill segítségével helyes modellnévvel és prompt cachinggel.
- **Mikor NE:** Ha a projekt más LLM szolgáltatót használ (OpenAI, Gemini stb.), ne használd (a `SKILL.md` frontmatter: "SKIP only when another provider is being worked on").

### 1.6 discernment-nudge

- **Mit csinál:** Érdemi válasz vagy vázlat után 2-3 rövid, konkrét kontrollkérdést fűz a válasz végére, hogy a felhasználó ellenőrizze a tényeket és feltevéseket. Beszélgetésenként legfeljebb egyszer (`skills/discernment-nudge/SKILL.md` frontmatter).
- **Bemenet / kimenet:** Bemenet: Claude saját, cselekvésre szánt válasza (tanács, terv, becslés). Kimenet: ugyanaz a válasz 2-3 követő kérdéssel.
- **Függőségek:** Nincs szkript (csak `SKILL.md`, `LICENSE.txt`).
- **Hálózat / fizetős API:** NOT FOUND (nincs hálózati utasítás). Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/discernment-nudge/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-08-17 (`f379e5a`)
- **Példa kisvállalkozásnak:** Egy videós cég árajánlat-tervezetet kér Claude-tól, és a végén kap kérdéseket arról, hogy reálisak-e a feltételezett óradíjak és a vágási idő.
- **Mikor NE:** Formázási vagy konvertálási feladatnál, kódírásnál vagy kreatív írásnál ne használd (a `SKILL.md` maga sorolja fel ezeket kizárásként).

### 1.7 doc-coauthoring

- **Mit csinál:** Strukturált munkafolyamaton vezeti végig a felhasználót dokumentumok (javaslat, specifikáció, döntési dokumentum) közös megírásában. A kontextus átadásától az iteratív finomításon át az olvasói teszteléséig tart (`skills/doc-coauthoring/SKILL.md`).
- **Bemenet / kimenet:** Bemenet: a felhasználó által adott kontextus, beillesztett vagy integrációval behúzott dokumentumok. Kimenet: kész, olvasóra tesztelt dokumentum.
- **Függőségek:** Nincs szkript. Opcionálisan integrációk: "e.g., Slack, Teams, Google Drive, SharePoint, or other MCP servers" (`SKILL.md:70`).
- **Hálózat / fizetős API:** Csak opcionálisan, ha integráció (connector) érhető el (`SKILL.md:70-80`). Fizetős API: nem.
- **Licenc:** NOT FOUND. A mappában nincs `LICENSE.txt` (a mappa tartalma csak `SKILL.md`), és a `SKILL.md` frontmatterében nincs `license:` mező. A repó gyökerében sincs `LICENSE` fájl.
- **Utolsó commit:** 2025-12-04 (`0075614`)
- **Példa kisvállalkozásnak:** Egy marketingügynökség az ügyfélnek szóló kampányjavaslatot írja meg vele lépésről lépésre, a végén egy "friss olvasó" teszttel ellenőrizve az érthetőséget.
- **Mikor NE:** Rövid, egyszeri szövegnél (pl. egy közösségi poszt) ne használd, mert a többlépcsős folyamat túl lassú hozzá.

### 1.8 docx

- **Mit csinál:** Word dokumentumok (.docx, .dotx) létrehozása, olvasása, szerkesztése, változáskövetéssel és megjegyzésekkel együtt. Új dokumentumot docx-js-sel, meglévőt XML szinten szerkeszt (`skills/docx/SKILL.md:14-21`).
- **Bemenet / kimenet:** Bemenet: .docx, .dotx, .doc fájl vagy szöveges kérés. Kimenet: .docx, PDF konverzió is (`SKILL.md:40`).
- **Függőségek:** "`docx` (npm, preinstalled ...) · `pandoc` · LibreOffice (`soffice`) · `pdftoppm` (Poppler)" (`SKILL.md:91`). Python szkriptek importjai: `defusedxml`, `lxml` (`skills/docx/scripts/`, pl. `scripts/office/validate.py`).
- **Hálózat / fizetős API:** NOT FOUND (a szkriptekben nincs hálózati hívás; a `socket` csak helyi Unix socketet nyit: `s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)`, `scripts/office/soffice.py:55`). Fizetős API: nem.
- **Licenc:** Proprietary. Idézet `skills/docx/LICENSE.txt`: "© 2025 Anthropic, PBC. All rights reserved." és "users may not: ... Create derivative works based on these materials"; `SKILL.md`: "license: Proprietary. LICENSE.txt has complete terms".
- **Utolsó commit:** 2026-07-16 (`fa0fa64`)
- **Példa kisvállalkozásnak:** Egy fordítóiroda az ügyfél által visszaküldött, változáskövetéssel teli Word fájlból elfogadja a módosításokat és tiszta végleges változatot ad le.
- **Mikor NE:** Ha a kód kikerülne a Claude szolgáltatáson kívülre (saját szerverre másolás, módosítás), ne használd, mert a licenc ezt tiltja.

### 1.9 frontend-design

- **Mit csinál:** Irányelvek egyedi, átgondolt vizuális dizájnhoz új UI építésekor vagy meglévő átalakításakor. Esztétikai irányt, tipográfiát ad, hogy az eredmény ne tűnjön sablonosnak (`skills/frontend-design/SKILL.md` frontmatter).
- **Bemenet / kimenet:** Bemenet: UI feladat. Kimenet: frontend kód (HTML/CSS/JS) dizájn döntésekkel.
- **Függőségek:** Nincs szkript (csak `SKILL.md`, `LICENSE.txt`).
- **Hálózat / fizetős API:** NOT FOUND. Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/frontend-design/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-09-03 (`41bbe19`)
- **Példa kisvállalkozásnak:** Egy fotós vállalkozás portfólió landing oldalát készítteti el, egyedi tipográfiával a generikus sablonok helyett.
- **Mikor NE:** Ha egy meglévő, kötött design systemhez kell pontosan igazodni, ne használd, mert a skill eltérő esztétikai döntések felé tol.

### 1.10 internal-comms

- **Mit csinál:** Belső kommunikáció írása cégspecifikus formátumokban: 3P update, hírlevél, FAQ, státuszjelentés, incidens riport. A típushoz tartozó útmutatót az `examples/` mappából tölti be (`skills/internal-comms/SKILL.md`).
- **Bemenet / kimenet:** Bemenet: a kommunikáció típusa és nyers információ. Kimenet: formázott belső szöveg.
- **Függőségek:** Nincs szkript; útmutatók: `examples/3p-updates.md`, `examples/company-newsletter.md`, `examples/faq-answers.md`, `examples/general-comms.md`.
- **Hálózat / fizetős API:** NOT FOUND. Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/internal-comms/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy 6 fős tartalomstúdió heti 3P (Progress, Plans, Problems) összefoglalót készít a csapatnak és a külsős szabadúszóknak.
- **Mikor NE:** Külső, ügyfélnek vagy nyilvánosságnak szánt marketingszövegre ne használd, mert belső formátumokra készült.

### 1.11 mcp-builder

- **Mit csinál:** Útmutató minőségi MCP (Model Context Protocol) szerverek építéséhez Pythonban (FastMCP) vagy Node/TypeScriptben. Kiértékelő szkriptet is ad a kész szerver teszteléséhez (`skills/mcp-builder/SKILL.md`, `scripts/evaluation.py`).
- **Bemenet / kimenet:** Bemenet: egy külső API vagy szolgáltatás leírása. Kimenet: MCP szerver kód; az `evaluation.py` egy XML kérdéssorból (`scripts/example_evaluation.xml`) kiértékelési riportot készít.
- **Függőségek:** `anthropic>=0.39.0`, `mcp>=1.1.0` (`skills/mcp-builder/scripts/requirements.txt`); Node oldalon `npx @modelcontextprotocol/inspector` (`SKILL.md:152`).
- **Hálózat / fizetős API:** Igen. Az `evaluation.py` az Anthropic API-t hívja: `client = Anthropic()` (`scripts/evaluation.py:228`), ez API kulcsot és fizetős használatot jelent; a `SKILL.md:81` webes keresést és WebFetch-et is javasol.
- **Licenc:** Apache 2.0. Idézet `skills/mcp-builder/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-10-28 (`ca45fc4`)
- **Példa kisvállalkozásnak:** Egy webshopos tartalomgyártó MCP szervert épít a saját termékkatalógus API-jához, hogy Claude közvetlenül onnan írjon termékleírásokat.
- **Mikor NE:** Ha már létezik kész, hivatalos connector az adott szolgáltatáshoz, ne építs újat vele.

### 1.12 pdf

- **Mit csinál:** PDF fájlok minden feldolgozása: szöveg és táblázat kinyerése, összefűzés, szétvágás, forgatás, vízjel, űrlapkitöltés, titkosítás, OCR. Az űrlapkitöltéshez külön szkriptsor tartozik (`skills/pdf/SKILL.md`, `skills/pdf/forms.md`).
- **Bemenet / kimenet:** Bemenet: PDF fájl(ok). Kimenet: módosított PDF, kinyert szöveg/táblázat, PNG oldalképek (`scripts/convert_pdf_to_images.py`).
- **Függőségek:** Python: `pypdf`, `pdfplumber`, `pdf2image`, `PIL` (Pillow) (szkript importok, `skills/pdf/scripts/`); a `SKILL.md` ezeket is említi: `reportlab` (121. sor), `pytesseract` (235. sor), `pypdfium2` (311. sor). Binárisok: `qpdf` (203. sor), `pdftotext` / poppler-utils (191. sor), `pdftk` (219. sor).
- **Hálózat / fizetős API:** NOT FOUND (a szkriptekben nincs hálózati hívás). Fizetős API: nem.
- **Licenc:** Proprietary. Idézet `skills/pdf/LICENSE.txt` (azonos a `docx` fájllal): "© 2025 Anthropic, PBC. All rights reserved."
- **Utolsó commit:** 2026-02-06 (`1ed29a0`)
- **Példa kisvállalkozásnak:** Egy rendezvényszervező cég a beérkezett fellépői szerződés PDF űrlapjait tölti ki automatikusan, és a havi ajánlatokat egy PDF-be fűzi.
- **Mikor NE:** Ha a kódot a Claude szolgáltatáson kívül, saját eszközbe akarod beépíteni, ne használd (proprietary licenc).

### 1.13 pptx

- **Mit csinál:** PowerPoint fájlok (.pptx, .potx) létrehozása, olvasása, szerkesztése, összefűzése, sablonokkal és előadói jegyzetekkel. Új diát `pptxgenjs`-sel készít, vizuális QA-t LibreOffice renderrel végez (`skills/pptx/SKILL.md:27-31`).
- **Bemenet / kimenet:** Bemenet: .pptx/.potx/.ppt fájl vagy kérés. Kimenet: .pptx, PDF, miniatűrök (`scripts/thumbnail.py`).
- **Függőségek:** "`pptxgenjs` (npm ...) · `markitdown[pptx]`, `Pillow`, `defusedxml`, `lxml` (pip ...) · LibreOffice (`soffice` ...) · `pdftoppm` (Poppler)" (`SKILL.md:238`); ikonokhoz `react-icons`, `react`, `react-dom`, `sharp` (`SKILL.md:50`).
- **Hálózat / fizetős API:** NOT FOUND a szkriptekben (a `socket` itt is helyi Unix socket, `scripts/office/soffice.py:20`). Csak akkor kell hálózat, ha egy előre telepítettnek feltételezett csomag hiányzik és `npm install` kell (`SKILL.md:31`). Fizetős API: nem.
- **Licenc:** Proprietary. Idézet `skills/pptx/LICENSE.txt`: "© 2025 Anthropic, PBC. All rights reserved."
- **Utolsó commit:** 2026-07-16 (`fa0fa64`)
- **Példa kisvállalkozásnak:** Egy YouTube-csatornát üzemeltető kis cég a havi nézettségi adatokból szponzoroknak szóló bemutató decket készít.
- **Mikor NE:** Ha Google Slides a célformátum és ott kell együtt szerkeszteni, ne ezt használd.

### 1.14 skill-creator

- **Mit csinál:** Új skillek létrehozása, meglévők javítása, és teljesítményük mérése evalokkal és benchmarkkal. A skill leírását is optimalizálja a jobb aktiválás érdekében (`skills/skill-creator/SKILL.md` frontmatter).
- **Bemenet / kimenet:** Bemenet: egy munkafolyamat leírása vagy meglévő skill mappa. Kimenet: skill mappa, `.skill` csomag (`scripts/package_skill.py`), HTML eval riport (`eval-viewer/generate_review.py`).
- **Függőségek:** Python standard könyvtár plusz `yaml` (PyYAML) (szkript importok, `skills/skill-creator/scripts/`); a `claude` CLI bináris: `cmd = ["claude", "-p", "--output-format", "text"]` (`scripts/improve_description.py:26`).
- **Hálózat / fizetős API:** Közvetve igen: a `claude -p` hívás a Claude Code munkamenet hitelesítését használja, "no separate ANTHROPIC_API_KEY needed" (`scripts/improve_description.py:5-6`), tehát Claude előfizetés vagy kvóta fogy. Az eval viewer helyi HTTP szervert indít: `from http.server import HTTPServer, BaseHTTPRequestHandler` (`eval-viewer/generate_review.py:27`).
- **Licenc:** Apache 2.0. Idézet `skills/skill-creator/LICENSE.txt`: "Apache License / Version 2.0, January 2004". Megjegyzés: a `SKILL.md` frontmatterében nincs `license:` mező.
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy tartalomgyártó cég a saját "heti blogposzt a márkahangon" folyamatát skillé alakítja, és evalokkal ellenőrzi, hogy jól aktiválódik-e.
- **Mikor NE:** Egyszeri feladathoz ne használd, mert a skill csak ismétlődő folyamatnál térül meg.

### 1.15 slack-gif-creator

- **Mit csinál:** Slackre optimalizált animált GIF-ek készítése, méret és fps korlátokkal, validálással. Emoji GIF-hez 128x128, üzenet GIF-hez 480x480 ajánlott (`skills/slack-gif-creator/SKILL.md`).
- **Bemenet / kimenet:** Bemenet: szöveges kérés ("make me a GIF of X doing Y"). Kimenet: .gif fájl (`core/gif_builder.py`).
- **Függőségek:** "pillow>=10.0.0, imageio>=2.31.0, imageio-ffmpeg>=0.4.9, numpy>=1.24.0" (`skills/slack-gif-creator/requirements.txt`).
- **Hálózat / fizetős API:** NOT FOUND (a `core/` szkriptekben nincs hálózati hívás; csomagtelepítéshez kellhet). Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/slack-gif-creator/LICENSE.txt`: "Apache License / Version 2.0, January 2004". Az `imageio` és `imageio-ffmpeg` harmadik feles licencei a `THIRD_PARTY_NOTICES.md` fájlban (BSD 2-Clause).
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy kis ügynökség a csapat Slackjébe egyedi "jóváhagyva" animált emojit készít az ügyféllogóval.
- **Mikor NE:** Hosszú vagy jó minőségű videós tartalomhoz ne használd, mert rövid, kis méretű GIF-ekre készült.

### 1.16 theme-factory

- **Mit csinál:** Artifactok (diák, dokumentumok, HTML oldalak) stílusozása 10 előre definiált témával, vagy menet közben generált új témával. Minden téma színpalettát és betűpárt ad (`skills/theme-factory/SKILL.md`).
- **Bemenet / kimenet:** Bemenet: kész artifact és témaválasztás (a `theme-showcase.pdf` alapján). Kimenet: a témával formázott artifact.
- **Függőségek:** Nincs szkript; témafájlok: `themes/*.md` (10 db), `theme-showcase.pdf`.
- **Hálózat / fizetős API:** NOT FOUND. Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/theme-factory/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy oktatási tartalmakat gyártó cég a negyedéves ügyfélriportjait egységesen az "Ocean Depths" témával formázza.
- **Mikor NE:** Ha már van rögzített saját arculat, ne használd, mert a kész témák eltérnek tőle.

### 1.17 web-artifacts-builder

- **Mit csinál:** Összetett, többkomponensű claude.ai HTML artifactok készítése React, Tailwind CSS és shadcn/ui segítségével. A végén egyetlen HTML fájlba csomagol (`skills/web-artifacts-builder/SKILL.md`).
- **Bemenet / kimenet:** Bemenet: projektnév és webapp igény (`bash scripts/init-artifact.sh <project-name>`, `SKILL.md:28`). Kimenet: `bundle.html` (`SKILL.md:52`).
- **Függőségek:** Node 18+ (`SKILL.md:39`), `pnpm` (ha nincs, `npm install -g pnpm`, `scripts/init-artifact.sh:36`), Vite, Tailwind, Radix UI, Parcel, `html-inline` (`scripts/init-artifact.sh:59-273`, `scripts/bundle-artifact.sh:21`).
- **Hálózat / fizetős API:** Igen, hálózat kell az npm csomagok letöltéséhez: `pnpm install ...` (`scripts/init-artifact.sh:69`, `78-79`, `272-273`), `pnpm add -D parcel ...` (`scripts/bundle-artifact.sh:21`). Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/web-artifacts-builder/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy tartalomügynökség interaktív, szűrhető tartalomnaptár artifactot épít az ügyfeleinek bemutatásra.
- **Mikor NE:** Egyszerű, egyfájlos HTML artifacthoz ne használd (a `SKILL.md` maga mondja: "not for simple single-file HTML/JSX artifacts").

### 1.18 webapp-testing

- **Mit csinál:** Helyi webalkalmazások tesztelése Playwright-tal: funkciók ellenőrzése, UI hibakeresés, képernyőképek és böngészőkonzol naplók. A `with_server.py` a szerverek életciklusát kezeli (`skills/webapp-testing/SKILL.md:12`).
- **Bemenet / kimenet:** Bemenet: helyi webapp (URL vagy indítóparancs). Kimenet: tesztszkript, képernyőképek, konzol naplók (`examples/console_logging.py`).
- **Függőségek:** Python `playwright` (`from playwright.sync_api import sync_playwright`, `SKILL.md:54`) és egy Chromium böngésző.
- **Hálózat / fizetős API:** Csak helyi hálózat: `socket.create_connection(('localhost', port), timeout=1)` (`scripts/with_server.py:28`). Külső hálózat: NOT FOUND. Fizetős API: nem.
- **Licenc:** Apache 2.0. Idézet `skills/webapp-testing/LICENSE.txt`: "Apache License / Version 2.0, January 2004".
- **Utolsó commit:** 2026-04-20 (`b9e19e6`)
- **Példa kisvállalkozásnak:** Egy webshopos kisvállalkozás minden oldalfrissítés után ellenőrizteti, hogy a hírlevél-feliratkozó űrlap működik-e, képernyőképpel.
- **Mikor NE:** Éles, idegen weboldalak tömeges automatizálására ne használd, mert helyi alkalmazások tesztelésére készült.

### 1.19 xlsx

- **Mit csinál:** Táblázatfájlok (.xlsx, .xlsm, .csv, .tsv) megnyitása, szerkesztése, létrehozása, tisztítása, képletekkel és diagramokkal. A képleteket LibreOffice-szal újraszámolja és ellenőrzi (`skills/xlsx/SKILL.md`, `scripts/recalc.py`).
- **Bemenet / kimenet:** Bemenet: táblázatfájl vagy nyers adat. Kimenet: táblázatfájl (a `SKILL.md` szerint: "The deliverable must be a spreadsheet file"), a `recalc.py` JSON hibajelentést ad (`SKILL.md:40`).
- **Függőségek:** "`openpyxl`, `pandas`, `markitdown` (pip ...) · LibreOffice (`soffice` ...)" (`SKILL.md:99`); szkript importok: `defusedxml`, `lxml`, `openpyxl` (`skills/xlsx/scripts/`).
- **Hálózat / fizetős API:** NOT FOUND (a `socket` itt is helyi, `scripts/office/soffice.py:20`). Fizetős API: nem.
- **Licenc:** Proprietary. Idézet `skills/xlsx/LICENSE.txt`: "© 2025 Anthropic, PBC. All rights reserved."
- **Utolsó commit:** 2026-07-16 (`fa0fa64`)
- **Példa kisvállalkozásnak:** Egy kis videós produkciós cég a szétszórt CSV exportokból (YouTube, Instagram) egységes, képletes havi teljesítménytáblát készít.
- **Mikor NE:** Ha Google Sheets API integráció vagy Word riport a cél, ne használd (a `SKILL.md` kifejezetten kizárja).

---

### 1.20 Összesítő táblázat

| Név | Mit csinál | Függőségek | Licenc | Utolsó commit |
|---|---|---|---|---|
| academy-guide | Claude Academy kurzust ajánl Claude használati kérdésekre | nincs szkript; URL letöltés (catalog.json) | Apache-2.0 | 2026-08-18 |
| algorithmic-art | Generatív művészet p5.js-sel | p5.js 1.7.0 (CDN), Google Fonts | Apache-2.0 | 2026-04-20 |
| brand-guidelines | Anthropic márkaszínek és betűk alkalmazása | Poppins, Lora betűtípus | Apache-2.0 | 2026-04-20 |
| canvas-design | Statikus PNG/PDF design filozófia alapján | canvas-fonts (OFL betűk); könyvtár NOT FOUND | Apache-2.0 (betűk: OFL) | 2026-04-20 |
| claude-api | Claude API / SDK referencia és migrációs eszközök | Anthropic SDK; Python stdlib; Node | Apache-2.0 | 2026-10-09 |
| discernment-nudge | 2-3 kontrollkérdés érdemi válasz után | nincs | Apache-2.0 | 2026-08-17 |
| doc-coauthoring | Strukturált dokumentum közös írás | nincs; opcionális connectorok | NOT FOUND | 2025-12-04 |
| docx | Word dokumentumok létrehozása és szerkesztése | docx (npm), pandoc, LibreOffice, Poppler, defusedxml, lxml | Proprietary | 2026-07-16 |
| frontend-design | Egyedi vizuális irány UI építéshez | nincs | Apache-2.0 | 2026-09-03 |
| internal-comms | Belső kommunikáció cégformátumokban | nincs | Apache-2.0 | 2026-04-20 |
| mcp-builder | MCP szerver építési útmutató és eval | anthropic, mcp, npx inspector | Apache-2.0 | 2026-10-28 |
| pdf | PDF olvasás, szerkesztés, űrlapkitöltés, OCR | pypdf, pdfplumber, pdf2image, Pillow, reportlab, pytesseract, qpdf, poppler | Proprietary | 2026-02-06 |
| pptx | PowerPoint létrehozás és szerkesztés | pptxgenjs, markitdown, Pillow, defusedxml, lxml, LibreOffice, Poppler | Proprietary | 2026-07-16 |
| skill-creator | Skillek készítése, javítása, mérése | PyYAML, claude CLI | Apache-2.0 | 2026-04-20 |
| slack-gif-creator | Slackre optimalizált animált GIF | pillow, imageio, imageio-ffmpeg, numpy | Apache-2.0 | 2026-04-20 |
| theme-factory | 10 kész téma artifactokra | nincs | Apache-2.0 | 2026-04-20 |
| web-artifacts-builder | React/Tailwind/shadcn artifact egy HTML-be | Node 18+, pnpm, Vite, Tailwind, Parcel | Apache-2.0 | 2026-04-20 |
| webapp-testing | Helyi webapp tesztelés Playwright-tal | playwright, Chromium | Apache-2.0 | 2026-04-20 |
| xlsx | Táblázatfájlok kezelése, képlet újraszámolás | openpyxl, pandas, markitdown, LibreOffice | Proprietary | 2026-07-16 |

```csv
name,what_it_does,dependencies,license,last_commit
academy-guide,"Claude Academy kurzust ajánl Claude használati kérdésekre","nincs szkript; URL letöltés (catalog.json)",Apache-2.0,2026-08-18
algorithmic-art,"Generatív művészet p5.js-sel","p5.js 1.7.0 (CDN), Google Fonts",Apache-2.0,2026-04-20
brand-guidelines,"Anthropic márkaszínek és betűk alkalmazása","Poppins, Lora betűtípus",Apache-2.0,2026-04-20
canvas-design,"Statikus PNG/PDF design filozófia alapján","canvas-fonts (OFL betűk); könyvtár NOT FOUND","Apache-2.0 (betűk: OFL)",2026-04-20
claude-api,"Claude API / SDK referencia és migrációs eszközök","Anthropic SDK; Python stdlib; Node",Apache-2.0,2026-10-09
discernment-nudge,"2-3 kontrollkérdés érdemi válasz után",nincs,Apache-2.0,2026-08-17
doc-coauthoring,"Strukturált dokumentum közös írás","nincs; opcionális connectorok",NOT FOUND,2025-12-04
docx,"Word dokumentumok létrehozása és szerkesztése","docx (npm), pandoc, LibreOffice, Poppler, defusedxml, lxml",Proprietary,2026-07-16
frontend-design,"Egyedi vizuális irány UI építéshez",nincs,Apache-2.0,2026-09-03
internal-comms,"Belső kommunikáció cégformátumokban",nincs,Apache-2.0,2026-04-20
mcp-builder,"MCP szerver építési útmutató és eval","anthropic, mcp, npx inspector",Apache-2.0,2026-10-28
pdf,"PDF olvasás, szerkesztés, űrlapkitöltés, OCR","pypdf, pdfplumber, pdf2image, Pillow, reportlab, pytesseract, qpdf, poppler",Proprietary,2026-02-06
pptx,"PowerPoint létrehozás és szerkesztés","pptxgenjs, markitdown, Pillow, defusedxml, lxml, LibreOffice, Poppler",Proprietary,2026-07-16
skill-creator,"Skillek készítése, javítása, mérése","PyYAML, claude CLI",Apache-2.0,2026-04-20
slack-gif-creator,"Slackre optimalizált animált GIF","pillow, imageio, imageio-ffmpeg, numpy",Apache-2.0,2026-04-20
theme-factory,"10 kész téma artifactokra",nincs,Apache-2.0,2026-04-20
web-artifacts-builder,"React/Tailwind/shadcn artifact egy HTML-be","Node 18+, pnpm, Vite, Tailwind, Parcel",Apache-2.0,2026-04-20
webapp-testing,"Helyi webapp tesztelés Playwright-tal","playwright, Chromium",Apache-2.0,2026-04-20
xlsx,"Táblázatfájlok kezelése, képlet újraszámolás","openpyxl, pandas, markitdown, LibreOffice",Proprietary,2026-07-16
```

---

## 2. rész: Graphify-Labs/graphify

Forrás URL minta: `https://github.com/Graphify-Labs/graphify/blob/v8/<fájl>`

### 2.1 Mit csinál

- Egy projekt mappát (kód, dokumentumok, PDF-ek, képek, videók) lekérdezhető tudásgráffá alakít, amelyet az AI kódasszisztens grep helyett kérdezhet le: "Type `/graphify` in your AI coding assistant and it maps your entire project (code, docs, PDFs, images, videos) into a **knowledge graph** you can **query instead of grepping** through files." (`README.md`).
- A kódot helyben, tree-sitter AST-vel, LLM nélkül dolgozza fel: "Code is parsed with tree-sitter AST: deterministic, no LLM, nothing leaves your machine." (`README.md`).
- Dokumentumokhoz, PDF-hez, képekhez LLM kell: "Docs, PDFs, images and video use your assistant's model, or a configured API key, for a semantic pass." (`README.md`).
- Nem vektoros index: "No embeddings, no vector store: a real graph you traverse." (`README.md`).
- A PyPI csomag neve `graphifyy`, verzió `0.9.97`; parancsok: `graphify` és `graphify-mcp` (`pyproject.toml`, `[project]` és `[project.scripts]`).
- Van fizetős felhő termék is (Graphify Cloud, 14 napos próba), de ez a repón kívül van (`README.md`, "Graphify Cloud" szakasz).

### 2.2 Telepítés

`README.md`, "Get started" és "Install" szakasz:

```bash
uv tool install graphifyy
```

```bash
graphify install
```

Alternatívák (`README.md`, "Install methods"):

```bash
pipx install graphifyy
```

```bash
pip install graphifyy
```

Projekt szintű telepítés: `graphify install --project` (`README.md`). Opcionális extrák, például `uv tool install "graphifyy[video]"` (`README.md`, "Optional extras"); az extrák teljes listája a `pyproject.toml` `[project.optional-dependencies]` szakaszában (pl. `mcp`, `pdf`, `office`, `video`, `ollama`, `anthropic`, `openai`, `neo4j`). Docker image is van az MCP HTTP szerverhez: `docker build -t graphify .` (`Dockerfile`).

### 2.3 Rendszerkövetelmények

- Python 3.10+: `requires-python = ">=3.10"` (`pyproject.toml`); "Python | 3.10+" (`README.md`, "Prerequisites" táblázat).
- `uv` (ajánlott) vagy `pipx` (`README.md`, "Prerequisites").
- Alapfüggőségek: `networkx`, `numpy`, `rapidfuzz`, `pyyaml`, `tree-sitter` és kb. 25 nyelvi tree-sitter grammar (`pyproject.toml`, `dependencies`).
- OS: "on macOS, Linux, and Windows" (`README.md`).
- Minimális CPU mag, RAM, lemez: NOT FOUND (sem a `README.md`, sem a `pyproject.toml`, sem a `docs/` nem ad meg számszerű hardverigényt).
- GPU követelmény: NOT FOUND (a repó sehol nem ír elő GPU-t).

### 2.4 Futtatható-e 2 magos, GPU nélküli Linux szerveren?

A repó explicit állítást erről nem tartalmaz (NOT FOUND). A kódból és dokumentációból ezek a tények következnek:

- A kódfeldolgozás tree-sitter alapú, LLM nélküli és offline: "A code-only corpus requires no API key: `graphify extract` runs fully offline." (`README.md`, "Privacy").
- A videó átírás kifejezetten CPU-n fut: `model = WhisperModel(model_name, device="cpu", compute_type="int8")` (`graphify/transcribe.py:150`).
- A dokumentumok szemantikus feldolgozása külső LLM-et vagy az asszisztens modelljét használja, tehát a gépen nem kell GPU (`README.md`, "Privacy"). Kivétel a helyi Ollama backend: ha azt ugyanazon a szerveren futtatnád, akkor az LLM futtatása igényelne erőforrást (a kódban: "Four concurrent 60k-token requests cause VRAM pressure", `graphify/llm.py:2833`).
- A Docker image `python:3.12-slim` alapú, GPU réteg nélkül (`Dockerfile`).

Következtetés a fenti forrásokból: igen, 2 magos, GPU nélküli Linuxon a kódgráf építés és a lekérdezés futtatható, mert minden helyi lépés CPU alapú. Sebességre vagy memóriára vonatkozó mérés 2 magos gépen: NOT FOUND (a repóban nincs 2 magos vagy vCPU szám szerinti mérés; futtatással nem ellenőriztem).

### 2.5 Licenc

- `pyproject.toml`: `license = "Apache-2.0"` és `license-files = ["LICENSE", "LICENSE-MIT", "NOTICE"]`.
- `LICENSE`: "Apache License / Version 2.0, January 2004".
- `NOTICE`: "This product is licensed under the Apache License, Version 2.0 (see LICENSE). Portions of this software were contributed under the MIT License prior to the relicensing and remain available under those terms. The original MIT license text is retained in LICENSE-MIT."
- `LICENSE-MIT`: "MIT License / Copyright (c) 2026 Safi Shamsi".
- Védjegy: "\"graphify\" and the graphify logo are marks of Graphify Labs" (`README.md`, "Building on graphify").

### 2.6 Hálózati hívások, telemetria, analitika, feltöltés

#### Használt keresés

A `graphify` repó gyökerében futtatva. A kódfájlokra (Python, JS, TS, shell, mjs) szűrve, a `tests/` és `docs/` mappát és a `.git`-et kizárva, kis- és nagybetű érzéketlenül:

```bash
grep -rniIE --exclude-dir=.git --exclude-dir=tests --exclude-dir=docs --include=*.py --include=*.js --include=*.ts --include=*.sh --include=*.mjs 'requests|httpx|urllib|fetch|telemetry|posthog|sentry|analytics' .
```

Kulcsszavanként a találatok száma (kód / teljes repó minden fájltípussal, beleértve a teszteket, dokumentációt, fordításokat):

| Kulcsszó | Kódban | Teljes repóban |
|---|---|---|
| requests | 11 | 232 |
| httpx | 4 | 524 |
| urllib | 40 | 56 |
| fetch | 80 | 582 |
| telemetry | 1 | 265 |
| posthog | 0 | 0 |
| sentry | 0 | 96 |
| analytics | 0 | 6 |

A `posthog`, `sentry` és `analytics` szavakra a kódfájlokban: NOT FOUND. (A `sentry` 96 találata csak a `README.md`-ben és a `docs/` alatt van, a Graphify Cloud "connectors for Sentry, Jira, and more" szövegében; az `analytics` 6 találata a `README.md`-ben és a `docs/translations/` fordításaiban van, a "no analytics" mondatban.)

#### Értelmezés (mi tényleges hálózati hívás)

- **Telemetria / analitika SDK:** NOT FOUND. A `README.md` "Privacy" szakasza: "**No telemetry**, no usage tracking, no analytics." Az egyetlen `telemetry` kód-találat egy megjegyzés: `graphify/querylog.py:20`.
- **URL letöltés (`graphify add <url>`):** `graphify/security.py:273` `safe_fetch` és `:317` `safe_fetch_text`, `urllib.request`-tel, SSRF védelemmel; hívja a `graphify/ingest.py` (tweet oEmbed: `https://publish.twitter.com/oembed?...`, `graphify/ingest.py:121`; arXiv; általános weboldal; kép letöltés `graphify/ingest.py:246`). Csak a felhasználó által megadott URL-re fut.
- **GitHub (PR funkciók):** a `gh` CLI-t hívja alfolyamatként, `["gh", *args]` (`graphify/prs.py:144`, `graphify/prs.py:283`), és az MCP szerverből is elérhető (`graphify/serve.py:2610-2670`).
- **Feltöltés LLM szolgáltatóhoz:** a keresett kulcsszavak ezt NEM fedik le, ezért kiegészítő kereséssel ellenőriztem (lásd lent). Az `openai`, `anthropic`, `boto3` kliensek a `graphify/llm.py`-ban és a `graphify/prs.py`-ban vannak (pl. `graphify/llm.py:1584`, `graphify/llm.py:1675`, `graphify/llm.py:2054`, `graphify/prs.py:683`, `graphify/prs.py:697`). Ezek dokumentumtartalmat küldenek a választott szolgáltatónak, ha van API kulcs; `GRAPHIFY_BACKEND=none` kikapcsolja (`README.md`, "Privacy").
- **Videó letöltés:** `yt_dlp` (`graphify/transcribe.py:36`, `graphify/transcribe.py:83`), csak a video extrával és URL megadásakor.
- **MCP HTTP szerver:** a `Dockerfile` hálózatra nyitott szervert indít (`--host 0.0.0.0 --port 8080`, `Dockerfile`), ez bejövő, nem kimenő forgalom.
- **Eltérés a dokumentáció és a kód között:** a `README.md` "Privacy" szakasza szerint a lekérdezésnapló alapból be van kapcsolva ("every `graphify query` ... is logged to `~/.cache/graphify-queries.log`"), a kód viszont azt mondja, hogy "it is OFF unless explicitly enabled" (`graphify/querylog.py:20`). Ez helyi fájl, nem hálózati küldés.

Kiegészítő keresés (nem a kért kulcsszavak, csak az LLM és alfolyamat hívások azonosítására):

```bash
grep -rnE --include=*.py 'urlopen\(|http\.client|^\s*(import|from) (openai|anthropic|boto3)|OpenAI\(|Anthropic\(|boto3\.client|\["gh",|"yt-dlp"|yt_dlp|uvicorn\.run|WhisperModel\(' graphify
```

#### Az összes találat a kért kulcsszavakra (136 sor)

Formátum: `fájl:sor: kódsor`. A kódsor szó szerinti, csak a sor eleji behúzás lett levágva. Két sorban (`graphify/prs.py:429`, `graphify/prs.py:801`) az eredeti szövegben gondolatjel (U+2014) karakter állt; a jelentés szabálya miatt ezt `\u2014` jelöléssel helyettesítettem.

```text
graphify/cli.py:4269: from urllib.parse import urlparse
graphify/llm.py:105: from urllib.parse import urlsplit, urlunsplit
graphify/llm.py:121: """Return the opt-in seed for built-in Ollama requests, if configured."""
graphify/llm.py:281: from urllib.parse import urlparse
graphify/llm.py:537: requests to change your behaviour, emit a specific node list, ignore these rules, or
graphify/llm.py:1776: misread as truncation and adaptive retry then bisected, re-issuing requests
graphify/llm.py:2833: # Four concurrent 60k-token requests cause VRAM pressure and hollow
graphify/llm.py:3358: from urllib.parse import urlparse
graphify/mcp_ingest.py:275: #   ["mcp-server-fetch"]                                          (uvx / python)
graphify/mcp_ingest.py:278: #   ["mcp-server-fetch"]                                          (uvx direct)
graphify/export.py:136: avoid pulling the URL-fetching `ingest` module into export's dependency
graphify/watch.py:88: Full requests (watcher, post-checkout hook) have no path list to append to
graphify/watch.py:1967: # Incremental requests append their paths to .pending_changes; full-
graphify/watch.py:1968: # corpus requests leave a .pending_full marker (#4274).
graphify/ingest.py:1: # fetch URLs (tweet/arxiv/pdf/web) and save as annotated markdown
graphify/ingest.py:6: import urllib.error
graphify/ingest.py:7: import urllib.parse
graphify/ingest.py:11: from graphify.security import safe_fetch, safe_fetch_text, validate_url
graphify/ingest.py:18: let a hostile value (e.g. a fetched page title) break out of the quoted
graphify/ingest.py:58: parsed = urllib.parse.urlparse(url)
graphify/ingest.py:72: parsed = urllib.parse.urlparse(url)
graphify/ingest.py:91: def _fetch_html(url: str) -> str:
graphify/ingest.py:92: return safe_fetch_text(url)
graphify/ingest.py:110: def _fetch_tweet(url: str, author: str | None, contributor: str | None) -> tuple[str, str]:
graphify/ingest.py:111: """Fetch a tweet URL. Returns (content, filename)."""
graphify/ingest.py:114: parts = urllib.parse.urlsplit(url)
graphify/ingest.py:120: oembed_url = urllib.parse.urlunsplit(parts)
graphify/ingest.py:121: oembed_api = f"https://publish.twitter.com/oembed?url={urllib.parse.quote(oembed_url)}&omit_script=true"
graphify/ingest.py:123: data = json.loads(safe_fetch_text(oembed_api))
graphify/ingest.py:128: tweet_text = f"Tweet at {url} (could not fetch content)"
graphify/ingest.py:150: def _fetch_webpage(url: str, author: str | None, contributor: str | None) -> tuple[str, str]:
graphify/ingest.py:151: """Fetch a generic webpage and convert to markdown."""
graphify/ingest.py:152: html = _fetch_html(url)
graphify/ingest.py:179: def _fetch_arxiv(url: str, author: str | None, contributor: str | None) -> tuple[str, str]:
graphify/ingest.py:180: """Fetch arXiv abstract page."""
graphify/ingest.py:186: html = _fetch_html(api_url)
graphify/ingest.py:196: return _fetch_webpage(url, author, contributor)
graphify/ingest.py:246: out_path.write_bytes(safe_fetch(url))
graphify/ingest.py:252: Fetch a URL and save it into target_dir as a graphify-ready file.
graphify/ingest.py:271: suffix = Path(urllib.parse.urlparse(url).path).suffix or ".jpg"
graphify/ingest.py:283: content, filename = _fetch_tweet(url, author, contributor)
graphify/ingest.py:285: content, filename = _fetch_arxiv(url, author, contributor)
graphify/ingest.py:287: content, filename = _fetch_webpage(url, author, contributor)
graphify/ingest.py:288: except (urllib.error.HTTPError, urllib.error.URLError, OSError) as exc:
graphify/ingest.py:289: raise RuntimeError(f"ingest: failed to fetch {url!r}: {exc}") from exc
graphify/ingest.py:375: parser = argparse.ArgumentParser(description="Fetch a URL into a graphify /raw folder")
graphify/ingest.py:376: parser.add_argument("url", help="URL to fetch")
graphify/extractors/robot.py:227: # External library (SeleniumLibrary, RequestsLibrary, ...) -
graphify/extractors/resolution.py:2644: "unicodedata", "unittest", "urllib", "uu", "uuid", "venv", "warnings", "wave",
graphify/extractors/sql.py:305: # `EXTRACT(year FROM d)`, `TRIM(x FROM y)` and `FETCH NEXT FROM cur`: a FROM that names no table.
graphify/extractors/sql.py:308: r"|\bFETCH\s+(?:NEXT|PRIOR|FIRST|LAST|(?:ABSOLUTE|RELATIVE)\s+\S+)\s+)$",
graphify/extractors/engine.py:1740: ``self.svc.fetch()`` -> ``svc`` (the property the call is reached through).
graphify/extractors/engine.py:5359: ``Request``, ``httpx.Request``, ``"Request"``, ``Optional[Request]`` and
graphify/extractors/markdown.py:9: from urllib.parse import unquote
graphify/callflow_html.py:774: "ingest", "fetch", "download", "url", "html", "markdown",
graphify/exporters/graphdb.py:138: from urllib.parse import urlparse
graphify/google_workspace.py:17: import urllib.parse
graphify/google_workspace.py:73: parsed = urllib.parse.urlparse(url)
graphify/google_workspace.py:74: query = urllib.parse.parse_qs(parsed.query)
graphify/google_workspace.py:90: parsed = urllib.parse.urlparse(url)
graphify/google_workspace.py:91: query = urllib.parse.parse_qs(parsed.query)
graphify/prs.py:74: expected_base: str = "main"  # set by fetch_prs via _detect_default_branch
graphify/prs.py:139: # ── GitHub data fetching ──────────────────────────────────────────────────────
graphify/prs.py:242: def fetch_prs(repo: str | None = None, base: str | None = None, limit: int = 50) -> list[PRInfo]:
graphify/prs.py:258: def fetch_pr(number: int, repo: str | None = None, base: str | None = None) -> PRInfo | None:
graphify/prs.py:277: def fetch_pr_files(number: int, repo: str | None = None) -> list[str]:
graphify/prs.py:352: def fetch_worktrees() -> dict[str, str]:
graphify/prs.py:409: """Fetch PR file lists concurrently, compute graph impact, return community labels."""
graphify/prs.py:429: # Fetch diffs concurrently \u2014 gh pr diff is the bottleneck (network I/O)
graphify/prs.py:434: pool.submit(fetch_pr_files, pr.number, repo): pr
graphify/prs.py:778: prs = fetch_prs(repo=repo, base=base)
graphify/prs.py:783: worktrees = fetch_worktrees()
graphify/prs.py:790: match = fetch_pr(pr_number, repo=repo, base=base)
graphify/prs.py:801: # Graph impact is expensive (concurrent gh pr diff calls) \u2014 only fetch when
graphify/pg_introspect.py:40: tables = cur.fetchall()
graphify/pg_introspect.py:49: views = cur.fetchall()
graphify/pg_introspect.py:59: routines = cur.fetchall()
graphify/pg_introspect.py:98: fks = cur.fetchall()
graphify/swift_dispatch.py:3: `store.fetch()` on an injected `Store` resolves to the protocol's own `.fetch()`
graphify/swift_dispatch.py:5: `RemoteStore.fetch()` is a separate node, and nothing joins the two, so a
graphify/security.py:1: # Security helpers - URL validation, safe fetch, path guards, label sanitisation
graphify/security.py:8: import urllib.error
graphify/security.py:9: import urllib.parse
graphify/security.py:10: import urllib.request
graphify/security.py:21: _MAX_FETCH_BYTES = 52_428_800   # 50 MB hard cap for binary downloads
graphify/security.py:109: for SSRF or local file access. Also blocks requests to private/reserved
graphify/security.py:113: parsed = urllib.parse.urlparse(url)
graphify/security.py:165: # non-thread-safe TOCTOU hazard when multiple fetches run concurrently),
graphify/security.py:178: matching the failure mode urllib/http.client expect from connect().
graphify/security.py:232: class _SSRFGuardedHTTPHandler(urllib.request.HTTPHandler):
graphify/security.py:233: """urllib handler that routes http:// through _SSRFGuardedHTTPConnection."""
graphify/security.py:239: class _SSRFGuardedHTTPSHandler(urllib.request.HTTPSHandler):
graphify/security.py:240: """urllib handler that routes https:// through _SSRFGuardedHTTPSConnection."""
graphify/security.py:246: class _NoFileRedirectHandler(urllib.request.HTTPRedirectHandler):
graphify/security.py:258: def _build_opener() -> urllib.request.OpenerDirector:
graphify/security.py:262: return urllib.request.build_opener(
graphify/security.py:270: # Safe fetch
graphify/security.py:273: def safe_fetch(url: str, max_bytes: int = _MAX_FETCH_BYTES, timeout: int = 30) -> bytes:
graphify/security.py:274: """Fetch *url* and return raw bytes.
graphify/security.py:280: - Non-2xx status raises urllib.error.HTTPError
graphify/security.py:281: - Network errors propagate as urllib.error.URLError / OSError
graphify/security.py:285: urllib.error.HTTPError  - non-2xx HTTP status
graphify/security.py:286: urllib.error.URLError   - DNS / connection failure
graphify/security.py:291: req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 graphify/1.0"})
graphify/security.py:294: # urllib raises HTTPError for non-2xx when using urlopen directly;
graphify/security.py:298: raise urllib.error.HTTPError(url, status, f"HTTP {status}", {}, None)
graphify/security.py:317: def safe_fetch_text(url: str, max_bytes: int = _MAX_TEXT_BYTES, timeout: int = 15) -> str:
graphify/security.py:318: """Fetch *url* and return decoded text (UTF-8, replacing bad bytes).
graphify/security.py:320: Wraps safe_fetch with tighter defaults for HTML / text content.
graphify/security.py:322: raw = safe_fetch(url, max_bytes=max_bytes, timeout=timeout)
graphify/__main__.py:898: print("  add <url>               fetch a URL and save it to ./raw, then update the graph")
graphify/querylog.py:20: # no-telemetry posture, so it is OFF unless explicitly enabled:
graphify/manifest_ingest.py:210: """`requests>=2.0` -> `requests`; `pkg[extra]==1; python_version<'3.9'` -> `pkg`."""
graphify/serve.py:2610: from graphify.prs import fetch_prs, fetch_worktrees, format_prs_text, _detect_default_branch
graphify/serve.py:2614: prs = fetch_prs(repo=repo, base=base)
graphify/serve.py:2617: worktrees = fetch_worktrees()
graphify/serve.py:2623: from graphify.prs import fetch_pr_files, compute_pr_impact, _gh, _parse_ci
graphify/serve.py:2634: files = fetch_pr_files(number, repo)
graphify/serve.py:2654: from graphify.prs import fetch_prs, fetch_worktrees, fetch_pr_files, compute_pr_impact, _STATUS_ORDER, _detect_default_branch
graphify/serve.py:2658: prs = fetch_prs(repo=repo, base=base)
graphify/serve.py:2661: worktrees = fetch_worktrees()
graphify/serve.py:2667: # Fetch diffs concurrently then compute graph impact using in-memory G
graphify/serve.py:2670: future_to_pr = {pool.submit(fetch_pr_files, pr.number, repo): pr for pr in actionable}
worked/example/raw/storage.py:66: """Fetch a single document by ID."""
worked/example/raw/api.py:28: """Fetch a document by ID and return it."""
worked/httpx/raw/transport.py:82: # Simplified: in real httpx this does the actual socket I/O
worked/httpx/raw/transport.py:118: Routes requests through an HTTP/HTTPS proxy.
worked/httpx/raw/exceptions.py:2: httpx-like exception hierarchy.
worked/httpx/raw/exceptions.py:8: """Base class for all httpx exceptions."""
tools/skillgen/gen.py:57: # is an ancestor of origin/v8 and is fetched under the CI `fetch-depth: 0`.
tools/skillgen/gen.py:791: """Whether origin/v8 is fetchable in this checkout.
tools/skillgen/gen.py:795: does not fetch that ref, so the validators set fetch-depth: 0 to fetch it.
tools/skillgen/gen.py:1507: # this for real by setting fetch-depth: 0 so the validators actually run.
tools/skillgen/gen.py:1511: "SKIPPED: origin/v8 is not fetchable in this checkout, so the git-show "
tools/skillgen/gen.py:1512: "validators cannot run. On CI, set fetch-depth: 0 on this job (actions/"
tools/skillgen/gen.py:1513: "checkout) so origin/v8 is fetched and the validators run for real.",
```

---

## Források összefoglalva

- `https://github.com/anthropics/skills` (README.md, THIRD_PARTY_NOTICES.md, skills/*/SKILL.md, skills/*/LICENSE.txt, skills/*/scripts/*)
- `https://github.com/Graphify-Labs/graphify` (README.md, pyproject.toml, LICENSE, LICENSE-MIT, NOTICE, Dockerfile, graphify/*.py)
