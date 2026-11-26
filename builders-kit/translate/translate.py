#!/usr/bin/env python3
"""Translate a list of English UI strings into many languages, then have a second
model proofread every translation. The pipeline behind tphm.io's 31 languages.

  export OPENROUTER_API_KEY=...
  python3 translate.py strings.json fr,de,ja,pt --context "A personal site for a solo builder."

strings.json is a JSON list of English strings. Output goes to i18n/<code>.json as
{english: translation}. Only missing strings are translated, so hand-fixed entries stay.

Inline markup survives because you write it as tokens: <t0>bold</t0>, <t1/> and {0}.
Any translation that drops or renames a token is rejected and reported.
"""
import argparse, json, os, re, subprocess, threading, time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

WRITER, REVIEWER = "anthropic/claude-sonnet-5.5", "google/gemini-3.8-flash"
TAG = re.compile(r"</?t\d+/?>|\{\d+\}")
sig = lambda s: Counter(TAG.findall(s))
RULES = ("Translate each English string, then reread and rewrite it so it reads as native, idiomatic web copy. "
         "Keep the meaning and every detail; add nothing. Keep every markup token (<t3>..</t3>, <t5/>, {0}) exactly once, "
         "unchanged; you may move them to fit word order. Keep brand and product names, domains and code untranslated. "
         "Use the correct script and punctuation for each language. Keep the author's informal, first-person voice.")

def call(model, system, user, schema):
    body = {"model": model, "max_tokens": 12000, "reasoning": {"effort": "low"},
            "response_format": {"type": "json_schema", "json_schema": {"name": "o", "strict": True, "schema": schema}},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    hdr = ["-H", "Content-Type: application/json"]
    if os.environ.get("OPENROUTER_API_KEY"): hdr += ["-H", "Authorization: Bearer " + os.environ["OPENROUTER_API_KEY"]]
    err = ""
    for attempt in range(5):  # backs off on rate limits (429) and transient errors
        if attempt: time.sleep(6 * attempt)
        o = subprocess.run(["curl", "-sS", "--max-time", "600", "https://openrouter.ai/api/v1/chat/completions", *hdr, "--data-binary", "@-"],
                           input=json.dumps(body), capture_output=True, text=True)
        try:
            b = json.loads(o.stdout); return json.loads(b["choices"][0]["message"]["content"]), b.get("usage", {}).get("cost") or 0
        except Exception: err = (o.stdout or o.stderr)[:300]
    raise RuntimeError(err)

def batch(langs, chunk, ctx):
    items = [{"id": i, "en": s} for i, s in enumerate(chunk)]
    props = {"id": {"type": "integer"}, **{"L_" + l: {"type": "string"} for l in langs}}
    sch = {"type": "object", "additionalProperties": False, "required": ["items"], "properties": {"items": {"type": "array", "items": {
        "type": "object", "additionalProperties": False, "properties": props, "required": list(props)}}}}
    tg = "Target languages (JSON field = language code): " + ", ".join("L_" + l for l in langs)
    w, c1 = call(WRITER, "You are a senior localisation writer. " + ctx + " " + RULES, tg + "\nStrings: " + json.dumps(items, ensure_ascii=False), sch)
    r, c2 = call(REVIEWER, "You are a native-speaker reviewer for these languages. " + ctx + " Fix mistranslations, awkward or literal phrasing, "
                 "lost or added detail, leftover English, wrong script and damaged tokens. " + RULES + " Return every item, corrected.",
                 tg + "\n" + json.dumps({"source": items, "translations": w["items"]}, ensure_ascii=False), sch)
    wm, rm = {x["id"]: x for x in w["items"]}, {x["id"]: x for x in r["items"]}
    out, bad = {}, []
    for i, s in enumerate(chunk):
        for l in langs:
            v = rm.get(i, {}).get("L_" + l)
            if not v or sig(v) != sig(s): v = wm.get(i, {}).get("L_" + l)  # fall back to the writer if the reviewer broke a token
            if v and sig(v) == sig(s): out.setdefault(l, {})[s] = v.strip()
            else: bad.append((l, s))
    return out, bad, c1 + c2

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("strings"); ap.add_argument("langs")
    ap.add_argument("--out", default="i18n"); ap.add_argument("--context", default=""); ap.add_argument("--workers", type=int, default=8)
    a = ap.parse_args(); src = json.loads(Path(a.strings).read_text()); langs = a.langs.split(",")
    out = Path(a.out); out.mkdir(exist_ok=True)
    D = {l: json.loads((out / f"{l}.json").read_text()) if (out / f"{l}.json").exists() else {} for l in langs}
    groups = [langs[i:i + 2] for i in range(0, len(langs), 2)]  # two languages per call keeps replies within limits
    jobs = [(g, todo[n:n + 12]) for g in groups for todo in [[s for s in src if any(s not in D[l] for l in g)]] for n in range(0, len(todo), 12)]
    lock, bads, cost = threading.Lock(), [], [0.0]
    def run(job):
        g, chunk = job
        try: res, bad, c = batch(g, chunk, a.context)
        except Exception as e: print("failed", g, str(e)[:120]); res, bad, c = {}, [(l, s) for l in g for s in chunk], 0
        with lock:
            cost[0] += c; bads.extend(bad)
            for l in g:
                D[l].update({k: v for k, v in res.get(l, {}).items() if k not in D[l]})
                (out / f"{l}.json").write_text(json.dumps(D[l], ensure_ascii=False, indent=1, sort_keys=True))
    print(len(jobs), "calls to make")
    with ThreadPoolExecutor(a.workers) as ex: list(ex.map(run, jobs))
    for l, s in bads: print("  not translated:", l, s[:80])
    print(f"done, {len(bads)} rejected, about US${cost[0]:.2f}")

if __name__ == "__main__": main()
