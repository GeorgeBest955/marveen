#!/usr/bin/env python3
"""MIOFEEDATTACH1014: scripts/mio-feed-post.py, the JSON path pinned and the --attach path.

No live API, no vault, no real key: urlopen and vault() are replaced on the loaded module,
and every request the script would send is recorded instead.

  - WITHOUT --attach the request is byte for byte the old JSON request: same URL, method,
    body bytes, headers and timeout, and the same exit codes (0, 1, 2, 3, 4, 5). These cases
    also pass against the script before this change (MIO_FEED_POST=<old copy>).
  - WITH --attach: a .md file only, at most ATTACH_MAX_BYTES, valid UTF-8, not empty; its name
    and content pass the same content gates as the body (dash, non-Latin character, agent
    name), but not the length gate. Every refusal happens locally: no vault read, no request.
  - Without --confirm the run stops (3) and names the file, its size in bytes and its sha256.
  - With --confirm the request is multipart/form-data: the three post fields and ONE "file"
    part carrying exactly the file's bytes.

Run: python3 <thisfile>   Exit 0 = all pass.
"""
import contextlib
import email
import email.policy
import hashlib
import importlib.util
import io
import os
import sys
import tempfile
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.environ.get("MIO_FEED_POST") or os.path.join(os.path.dirname(HERE), "mio-feed-post.py")
CHANNEL = "11111111-2222-4333-8444-555555555555"
KEY = "mrv_EXAMPLE_not_a_key"

failed = []


def check(name, cond):
    print(("PASS " if cond else "FAIL ") + name)
    if not cond:
        failed.append(name)


def load():
    spec = importlib.util.spec_from_file_location("mio_feed_post_under_test", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Resp:
    def __init__(self, status=201, body=b'{"status":"published"}'):
        self.status, self._body = status, body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def run(args, key=KEY, http_error=None):
    """main() with sys.argv = args; returns (rc, stdout, stderr, requests, vault_calls)."""
    mod = load()
    sent, vault_calls = [], []

    def fake_urlopen(req, timeout=None):
        sent.append({"url": req.full_url, "method": req.get_method(), "data": req.data,
                     "headers": dict(req.header_items()), "timeout": timeout})
        if http_error:
            raise urllib.error.HTTPError(req.full_url, http_error, "err", {}, io.BytesIO(b'{"error":"x"}'))
        return Resp()

    def fake_vault(name):
        vault_calls.append(name)
        return key

    mod.urllib.request.urlopen = fake_urlopen
    mod.vault = fake_vault
    out, err = io.StringIO(), io.StringIO()
    old_argv = sys.argv
    sys.argv = ["mio-feed-post.py"] + args
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            rc = mod.main()
    finally:
        sys.argv = old_argv
    return rc, out.getvalue(), err.getvalue(), sent, vault_calls


tmp = tempfile.mkdtemp(prefix="mio-feed-post-test-")


def fpath(name, data):
    p = os.path.join(tmp, name)
    with open(p, "wb") as f:
        f.write(data if isinstance(data, bytes) else data.encode("utf-8"))
    return p


TITLE = fpath("cim.txt", "Teszt cím\n")
BODY = fpath("torzs.txt", "Árvíztűrő tükörfúrógép, egy rövid próbaszöveg.\n")
BAD_BODY = fpath("rossz.txt", "Egy gondolatjel \u2014 itt.\n")

# ---------------------------------------------------------------------------
# 1. The JSON path, byte for byte (green on the old script too)
# ---------------------------------------------------------------------------
EXPECTED_JSON = (b'{"channel_id": "11111111-2222-4333-8444-555555555555", "title": "Teszt c\\u00edm", '
                 b'"content": "\\u00c1rv\\u00edzt\\u0171r\\u0151 t\\u00fck\\u00f6rf\\u00far\\u00f3g\\u00e9p, '
                 b'egy r\\u00f6vid pr\\u00f3basz\\u00f6veg."}')

rc, out, err, sent, vc = run([CHANNEL, TITLE, BODY])
check("json: no --confirm -> exit 3", rc == 3)
check("json: no --confirm -> no request, no vault read", sent == [] and vc == [])
check("json: no --confirm -> stderr is exactly the old two lines",
      err == "kapu OK (cim 9, torzs 46 karakter)\n"
             "STOP: a kozzetetel VISSZAVONHATATLAN. Add hozza a --confirm kapcsolot.\n")

rc, out, err, sent, vc = run([CHANNEL, TITLE, BODY, "--confirm"])
check("json: --confirm -> exit 0", rc == 0)
check("json: exactly one request", len(sent) == 1)
r = sent[0] if sent else {}
check("json: URL and method", r.get("url") == "https://api.marveen.io/agent/v1/feed/posts"
      and r.get("method") == "POST")
check("json: body bytes unchanged", r.get("data") == EXPECTED_JSON)
check("json: headers unchanged", r.get("headers") == {"Authorization": f"Bearer {KEY}",
                                                      "Content-type": "application/json"})
check("json: timeout 30", r.get("timeout") == 30)
check("json: the key comes from MARVEEN_IO_API_KULCS", vc == ["MARVEEN_IO_API_KULCS"])
check("json: stdout is the status and the answer", out == 'HTTP 201\n{"status":"published"}\n')

rc, out, err, sent, vc = run([CHANNEL, TITLE, BAD_BODY, "--confirm"])
check("json: a body gate failure -> exit 1, nothing sent", rc == 1 and sent == [] and vc == [])
rc, *_ , sent, vc = run(["nem-uuid", TITLE, BODY, "--confirm"])
check("json: bad channel uuid -> exit 2", rc == 2 and sent == [])
rc, *_ , sent, vc = run([CHANNEL, TITLE])
check("json: too few arguments -> exit 2", rc == 2 and sent == [])
rc, *_ , sent, vc = run([CHANNEL, TITLE, BODY, "--confirm"], key="")
check("json: no key in the vault -> exit 4, nothing sent", rc == 4 and sent == [])
rc, out, *_ = run([CHANNEL, TITLE, BODY, "--confirm"], http_error=422)
check("json: an HTTP error -> exit 5", rc == 5 and out.startswith("HTTP 422\n"))

# Everything below is the new path; against the old script it fails by design.
if os.environ.get("MIO_FEED_POST_JSON_ONLY") == "1":
    print("(JSON_ONLY: the --attach cases are skipped)")
    sys.exit(1 if failed else 0)

# ---------------------------------------------------------------------------
# 2. --attach: local refusals (exit 1, no vault read, no request)
# ---------------------------------------------------------------------------
MD = "# Leírás\n\nEgy rövid, csatolható fájl.\n"
GOOD = fpath("leiras.md", MD)


def refused(label, path, needle):
    rc, out, err, sent, vc = run([CHANNEL, TITLE, BODY, "--attach", path, "--confirm"])
    check(f"attach refused ({label}) -> exit 1, no vault read, no request",
          rc == 1 and sent == [] and vc == [])
    check(f"attach refused ({label}) -> names the reason", needle in err)


refused("not .md", fpath("leiras.txt", MD), "csak .md fajl csatolhato")
refused(".mdx is not .md", fpath("leiras.mdx", MD), "csak .md fajl csatolhato")
refused("over the cap", fpath("nagy.md", b"a" * 1_000_001), "1000001 bajt, a plafon 1000000")
refused("not UTF-8", fpath("bin.md", b"# x\n\xff\xfe\x00"), "nem ervenyes UTF-8")
refused("empty", fpath("ures.md", b"  \n"), "ures csatolmany")
refused("missing file", os.path.join(tmp, "nincs.md"), "nem olvashato")
refused("dash in the content", fpath("jel.md", "Egy sor \u2013 benne.\n"), "csatolmany: gondolatjel (U+2013)")
refused("dash entity in the content", fpath("ent.md", "Egy &mdash; entitas.\n"), "csatolmany: gondolatjel-entitas")
refused("non-Latin character in the content", fpath("nyil.md", "A \u2192 B\n"), "csatolmany: nem-latin karakter: U+2192")
refused("agent name in the content", fpath("nev.md", "Ezt Samu irta.\n"), "csatolmany: agens-nev a szovegben: Samu")
refused("agent name in the file name", fpath("Geri-jegyzet.md", MD), "csatolmany: agens-nev a szovegben: Geri")
refused("quote in the file name", fpath('a"b.md', MD), "idezojel vagy sortores")

rc, out, err, sent, vc = run([CHANNEL, TITLE, BAD_BODY, "--attach", GOOD, "--confirm"])
check("attach: the body gates still run first -> exit 1, nothing sent", rc == 1 and sent == [] and vc == [])
rc, *_ , sent, vc = run([CHANNEL, TITLE, BODY, "--attach"])
check("attach: --attach without a file -> exit 2", rc == 2 and sent == [])
rc, *_ , sent, vc = run([CHANNEL, TITLE, BODY, "--attach", "--confirm"])
check("attach: --attach followed by a flag -> exit 2", rc == 2 and sent == [])

# ---------------------------------------------------------------------------
# 3. --attach without --confirm: name, size, sha256; the limits are the right ones
# ---------------------------------------------------------------------------
raw = MD.encode("utf-8")
rc, out, err, sent, vc = run([CHANNEL, TITLE, BODY, "--attach", GOOD])
check("attach: no --confirm -> exit 3, no vault read, no request", rc == 3 and sent == [] and vc == [])
check("attach: no --confirm -> names the file, its bytes and its sha256",
      f"csatolmany OK: leiras.md, {len(raw)} bajt, sha256 {hashlib.sha256(raw).hexdigest()}" in err)

rc, *_ , sent, vc = run([CHANNEL, TITLE, BODY, "--attach", fpath("plafon.md", b"a" * 1_000_000)])
check("attach: exactly at the cap passes the local check", rc == 3)
rc, *_ = run([CHANNEL, TITLE, BODY, "--attach", fpath("hosszu.md", "a" * 25_000)])
check("attach: no length gate on the attachment (25 000 characters pass)", rc == 3)
rc, *_ = run([CHANNEL, TITLE, BODY, "--attach", fpath("Ekezet.MD", "Árvíz.\n")])
check("attach: the .md check ignores case, Hungarian accents pass", rc == 3)

# ---------------------------------------------------------------------------
# 4. --attach with --confirm: the multipart request
# ---------------------------------------------------------------------------
rc, out, err, sent, vc = run([CHANNEL, TITLE, BODY, "--attach", GOOD, "--confirm"])
check("attach: --confirm -> exit 0, one request", rc == 0 and len(sent) == 1)
r = sent[0] if sent else {"headers": {}, "data": b""}
check("attach: same URL and method", r.get("url") == "https://api.marveen.io/agent/v1/feed/posts"
      and r.get("method") == "POST")
ctype = r["headers"].get("Content-type", "")
check("attach: multipart/form-data with a boundary", ctype.startswith("multipart/form-data; boundary="))
check("attach: the bearer key, nothing else added",
      set(r["headers"]) == {"Authorization", "Content-type"} and r["headers"].get("Authorization") == f"Bearer {KEY}")
check("attach: timeout 30", r.get("timeout") == 30)
msg = email.message_from_bytes(b"Content-Type: " + ctype.encode() + b"\r\n\r\n" + (r.get("data") or b""),
                               policy=email.policy.HTTP)
parts = list(msg.iter_parts()) if msg.is_multipart() else []
fields = {p.get_param("name", header="content-disposition"): p for p in parts}
check("attach: exactly four parts, named channel_id, title, content, file",
      [p.get_param("name", header="content-disposition") for p in parts] == ["channel_id", "title", "content", "file"])
text = lambda n: fields[n].get_payload(decode=True).decode("utf-8") if n in fields else None
check("attach: channel_id field", text("channel_id") == CHANNEL)
check("attach: title field (UTF-8, stripped like the JSON path)", text("title") == "Teszt cím")
check("attach: content field (UTF-8, stripped like the JSON path)",
      text("content") == "Árvíztűrő tükörfúrógép, egy rövid próbaszöveg.")
fp = fields.get("file")
check("attach: the file part carries the base name and text/markdown",
      fp is not None and fp.get_filename() == "leiras.md" and fp.get_content_type() == "text/markdown")
check("attach: the file part is exactly the file's bytes", fp is not None and fp.get_payload(decode=True) == raw)
rc, out, *_ = run([CHANNEL, TITLE, BODY, "--attach", GOOD, "--confirm"], http_error=415)
check("attach: an HTTP error -> exit 5", rc == 5 and out.startswith("HTTP 415\n"))

print(f"\n{'ALL PASS' if not failed else str(len(failed)) + ' FAILED'}")
sys.exit(1 if failed else 0)
