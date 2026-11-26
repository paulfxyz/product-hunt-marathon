#!/usr/bin/env python3
"""brain_kit.py: a second brain for your AI, kept honest by checks that cost zero tokens.

Layout (create it with `init`):
  sources/        what you drop in: notes, transcripts, exports. The AI reads, never edits.
  brain/NOW.md    a short note on what matters this week. Read first, every session.
  brain/INDEX.md  one line per page. Read second.
  brain/*.md      the pages the AI writes and keeps up to date.
  RULES.md        the instructions you give your AI tool.
  .brain/         the manifest of source fingerprints.

Commands:
  init [DIR]                 create the layout
  changed                    list sources that are new or changed since the last `mark`
  mark [FILE ...]            record sources as processed (all of them if none given)
  lint                       check the brain: links, index, quotes, sizes (no AI involved)
  context "QUESTION"         print NOW + INDEX + the most relevant pages, within a budget
  stats                      rough token counts, so you can see what each read costs

Standard library only. Python 3.9+. MIT licence.
"""
import argparse, hashlib, json, os, re, sys
from pathlib import Path

ROOT = Path(os.environ.get("BRAIN_ROOT", ".")).resolve()
SRC, BRAIN, META = ROOT / "sources", ROOT / "brain", ROOT / ".brain"
MANIFEST = META / "manifest.json"
NOW_MAX_LINES, NOW_MAX_WORDS, PAGE_MAX_WORDS = 60, 400, 1500
SKIP = {"NOW.md", "INDEX.md"}

def tokens(text):  # good enough for budgeting: about 4 characters per token
    return max(1, len(text) // 4)

def read(p):
    return p.read_text(encoding="utf-8", errors="replace")

def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()

def sources():
    return sorted(p for p in SRC.rglob("*") if p.is_file() and not p.name.startswith("."))

def pages():
    return sorted(p for p in BRAIN.rglob("*.md") if p.name not in SKIP)

def rel(p):
    return p.relative_to(ROOT).as_posix()

def load_manifest():
    return json.loads(read(MANIFEST)) if MANIFEST.exists() else {}

def norm(s):
    return re.sub(r"\s+", " ", s.replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')).strip().lower()

# ---------- init
TEMPLATE_NOW = """# Now

Keep this under 60 lines. What matters this week, open decisions, what to avoid.

- 
"""
TEMPLATE_INDEX = """# Index

One line per page: [[page-name]] followed by what it answers.

"""
def cmd_init(a):
    root = Path(a.dir).resolve()
    for d in ("sources", "brain", ".brain"):
        (root / d).mkdir(parents=True, exist_ok=True)
    for path, body in ((root / "brain/NOW.md", TEMPLATE_NOW), (root / "brain/INDEX.md", TEMPLATE_INDEX)):
        if not path.exists():
            path.write_text(body, encoding="utf-8")
    rules = Path(__file__).with_name("RULES.md")
    if rules.exists() and not (root / "RULES.md").exists():
        (root / "RULES.md").write_text(read(rules), encoding="utf-8")
    if not (root / ".brain/manifest.json").exists():
        (root / ".brain/manifest.json").write_text("{}\n", encoding="utf-8")
    print(f"Ready in {root}. Drop files in sources/, then run: python3 brain_kit.py changed")

# ---------- changed / mark
def cmd_changed(a):
    m = load_manifest(); seen = set(); out = []
    for p in sources():
        k = rel(p); seen.add(k)
        if k not in m: out.append(("new", k))
        elif m[k] != sha(p): out.append(("changed", k))
    out += [("removed", k) for k in m if k not in seen]
    if a.json:
        print(json.dumps([{"status": s, "path": k} for s, k in out], indent=2)); return
    if not out:
        print("Nothing new. No need to spend tokens on an ingest today."); return
    for s, k in out:
        print(f"{s:8} {k}")
    print(f"\n{len(out)} file(s) to process. When the AI has updated the brain, run: python3 brain_kit.py mark")

def cmd_mark(a):
    m = load_manifest()
    targets = [ROOT / f for f in a.files] if a.files else sources()
    for p in targets:
        if p.is_file(): m[rel(p)] = sha(p)
    if not a.files:
        m = {k: v for k, v in m.items() if (ROOT / k).exists()}
    META.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps(m, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Marked {len(targets)} source(s) as processed.")

# ---------- lint
LINK = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]")
MDLINK = re.compile(r"\]\(((?!https?:|mailto:|#)[^)\s]+\.md)\)")
QUOTE = re.compile(r"^>\s*(.+?)\s*\((?:source|src):\s*([^)]+)\)\s*$", re.I)
SOURCED = re.compile(r"^(sources?|from):", re.I | re.M)

def cmd_lint(a):
    errors, warns = [], []
    if not BRAIN.exists():
        print("No brain/ folder here. Run: python3 brain_kit.py init"); sys.exit(1)
    names = {p.stem.lower(): p for p in pages()}
    now, index = BRAIN / "NOW.md", BRAIN / "INDEX.md"
    if not now.exists(): errors.append("brain/NOW.md is missing")
    else:
        t = read(now); lines = [l for l in t.splitlines() if l.strip()]
        if len(lines) > NOW_MAX_LINES or len(t.split()) > NOW_MAX_WORDS:
            warns.append(f"NOW.md is {len(lines)} lines / {len(t.split())} words; keep it under {NOW_MAX_LINES} / {NOW_MAX_WORDS}, it's read every session")
    indexed = set()
    if not index.exists(): errors.append("brain/INDEX.md is missing")
    else:
        for target in LINK.findall(read(index)):
            k = target.strip().lower(); indexed.add(k)
            if k not in names: errors.append(f"INDEX.md points to a missing page: [[{target}]]")
    inbound = {k: 0 for k in names}
    for p in pages():
        t = read(p); r = rel(p)
        for target in LINK.findall(t):
            k = target.strip().lower()
            if k in names: inbound[k] += 1
            else: errors.append(f"{r}: broken link [[{target}]]")
        for target in MDLINK.findall(t):
            if not (p.parent / target).resolve().exists(): errors.append(f"{r}: broken link ({target})")
        if p.stem.lower() not in indexed: errors.append(f"{r}: not listed in INDEX.md, so the AI will never find it")
        words = len(t.split())
        if words > PAGE_MAX_WORDS: warns.append(f"{r}: {words} words; split it so a task loads only what it needs")
        if not SOURCED.search(t) and not QUOTE.search(t): warns.append(f"{r}: no 'Sources:' line, so nobody can check where it came from")
        for n, line in enumerate(t.splitlines(), 1):
            mq = QUOTE.match(line.strip())
            if not mq: continue
            quote, src = mq.group(1).strip().strip('"\u201c\u201d'), mq.group(2).strip()
            sp = (ROOT / src).resolve()
            if not sp.exists(): errors.append(f"{r}:{n}: quote cites a missing source {src}")
            elif norm(quote) not in norm(read(sp)): errors.append(f"{r}:{n}: quote not found word for word in {src}")
    for k, c in inbound.items():
        if c == 0 and k not in indexed: warns.append(f"{rel(names[k])}: orphan page, nothing links to it")
    for e in errors: print("ERROR ", e)
    for w in warns: print("warn  ", w)
    print(f"\n{len(pages())} page(s), {len(errors)} error(s), {len(warns)} warning(s). 0 tokens spent.")
    sys.exit(1 if errors else 0)

# ---------- context
WORD = re.compile(r"[a-z0-9][a-z0-9\-]{2,}")
STOP = set("the and for with that this from what when where which how why are was were you your our has have had not but can will into about over than then them they their there here also just only".split())

def cmd_context(a):
    q = [w for w in WORD.findall(a.question.lower()) if w not in STOP]
    head = [p for p in (BRAIN / "NOW.md", BRAIN / "INDEX.md") if p.exists()]
    out = [f"<!-- {rel(p)} -->\n{read(p).strip()}" for p in head]
    used = sum(tokens(x) for x in out); picked = []
    scored = []
    for p in pages():
        t = read(p).lower(); title = p.stem.lower().replace("-", " ")
        s = sum(3 * title.count(w) + min(t.count(w), 5) for w in q)
        if s: scored.append((s, p))
    for s, p in sorted(scored, key=lambda x: -x[0])[: a.max_pages]:
        body = read(p).strip(); cost = tokens(body)
        if used + cost > a.budget: continue
        out.append(f"<!-- {rel(p)} -->\n{body}"); used += cost; picked.append(rel(p))
    print("\n\n".join(out))
    print(f"\n<!-- {len(picked)} page(s) picked, about {used} tokens of {a.budget}: {', '.join(picked) or 'none'} -->", file=sys.stderr)

# ---------- stats
def cmd_stats(a):
    def t(ps): return sum(tokens(read(p)) for p in ps if p.exists())
    first = t([BRAIN / "NOW.md", BRAIN / "INDEX.md"]); allp = t(pages()); src = t(sources())
    print(f"Read first (NOW + INDEX): ~{first} tokens")
    print(f"All brain pages:          ~{allp} tokens across {len(pages())} page(s)")
    print(f"All sources:              ~{src} tokens across {len(sources())} file(s)")
    if src > first * 2: print(f"A session that reads NOW + INDEX instead of every source loads ~{100 - round(100 * first / src)}% less.")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("init"); p.add_argument("dir", nargs="?", default="."); p.set_defaults(f=cmd_init)
    p = sp.add_parser("changed"); p.add_argument("--json", action="store_true"); p.set_defaults(f=cmd_changed)
    p = sp.add_parser("mark"); p.add_argument("files", nargs="*"); p.set_defaults(f=cmd_mark)
    p = sp.add_parser("lint"); p.set_defaults(f=cmd_lint)
    p = sp.add_parser("context"); p.add_argument("question"); p.add_argument("--budget", type=int, default=6000); p.add_argument("--max-pages", type=int, default=5); p.set_defaults(f=cmd_context)
    p = sp.add_parser("stats"); p.set_defaults(f=cmd_stats)
    a = ap.parse_args(); a.f(a)

if __name__ == "__main__":
    main()
