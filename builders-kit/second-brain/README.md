# second-brain/: keep the AI bill small

Twelve tools cost about US$2,200 to build, AI included. The biggest saving wasn't a cheaper model. It was never making the AI relearn the project.

This folder is the method, packaged: a layout of plain Markdown files, a rules file any AI tool can follow, and `brain_kit.py`, a small script that does the bookkeeping and the checks with zero tokens. It works with any assistant that reads instructions and files: coding agents, chat apps with project files, or your own scripts.

## The idea in one minute

- **Sources** go in `sources/`: notes, call transcripts, exports, decisions. Nobody edits them.
- **The brain** lives in `brain/`: short pages the AI writes from those sources and keeps current.
- **`brain/NOW.md`** says what matters this week. **`brain/INDEX.md`** lists every page in one line. The AI reads those two first, then only the pages the task needs.
- **Scripts check the work.** Broken links, pages missing from the index, quotes that don't match their source, a NOW note that's grown too long: `brain_kit.py lint` finds them in milliseconds, without a model.
- **Only new material costs money.** `brain_kit.py changed` fingerprints every source and lists what's new since the last ingest. If nothing changed, there's nothing to pay for.

## Quick start

```bash
python3 brain_kit.py init my-project      # creates sources/, brain/, RULES.md, .brain/
cd my-project
cp ~/notes/kickoff-call.md sources/       # drop in anything worth remembering
python3 ../brain_kit.py changed           # new  sources/kickoff-call.md
```

Then give `RULES.md` to your AI tool (paste it into AGENTS.md, CLAUDE.md, .cursorrules or the project's instructions) and ask it to ingest. When it's done:

```bash
python3 ../brain_kit.py lint              # 0 errors means links, index and quotes check out
python3 ../brain_kit.py mark              # record what was processed
```

Try it on the example first:

```bash
cd example && python3 ../brain_kit.py lint && python3 ../brain_kit.py context "why did launches stall"
```

## Commands

| Command | What it does | Tokens |
|---|---|---|
| `init [DIR]` | Creates the layout and copies `RULES.md` | 0 |
| `changed [--json]` | Lists sources that are new, changed or removed since the last `mark` | 0 |
| `mark [FILE ...]` | Records sources as processed (all of them by default) | 0 |
| `lint` | Checks links, the index, quotes against sources, page and NOW sizes; exits 1 on errors, so it fits in CI or a git hook | 0 |
| `context "QUESTION" [--budget 6000]` | Prints NOW + INDEX + the most relevant pages within a token budget, ready to paste or pipe into a model | 0 to run, then only what it picked |
| `stats` | Rough token counts for NOW + INDEX, all pages and all sources | 0 |

Set `BRAIN_ROOT=/path/to/project` to run it from anywhere. Standard library only, Python 3.9 or later.

## Habits that keep the bill small

1. **Read NOW and INDEX first, then only what the task needs.** Never load the whole folder.
2. **Skip the brain for general questions.** Syntax, a library's API, a definition: answer directly.
3. **Use the cheapest model that can do the job.** A strong model writes, a fast one proofreads. Keep reasoning effort low and escalate only when needed.
4. **Summarise long sources one at a time**, then merge the summaries, instead of pasting everything into one prompt.
5. **Let scripts check.** Character counts, links, markup, tests and `lint` cost nothing and don't grade their own homework.
6. **Only redo what changed.** `changed` tells you what's new; translate missing strings, not the whole site.
7. **Back up, dry-run, then write.** A mistake you have to undo costs more than the tokens you saved.

## Run it every night (optional)

```cron
# 02:00: ingest only if something changed, then check
0 2 * * * cd ~/my-project && python3 brain_kit.py changed --json | grep -q path && your-ai-cli "Ingest the files listed by brain_kit.py changed, following RULES.md" && python3 brain_kit.py lint && python3 brain_kit.py mark
```

Replace `your-ai-cli` with the command-line tool you use. Keep a person in the loop for anything that publishes or deletes.

## Limits

- `context` ranks pages by keyword overlap. It's crude on purpose: fast, free and predictable. For large brains, keep INDEX.md descriptive and let the AI choose pages from it.
- `lint` checks structure and quotes, not whether a summary is right. Read the pages that matter.
- Token counts are estimates (about 4 characters per token).

MIT licence, like the rest of the kit.
