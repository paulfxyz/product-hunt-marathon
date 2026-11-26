# Rules for the AI: how to use this second brain

Copy this file into your AI tool's instruction file (AGENTS.md, CLAUDE.md, .cursorrules, a project's custom instructions, a system prompt). Adjust the paths if your layout differs.

## Reading order

1. Read `brain/NOW.md` first. It's short on purpose.
2. Read `brain/INDEX.md` next, to see which pages exist.
3. Open only the pages the task needs. Never load the whole `brain/` folder.
4. Open a file in `sources/` only when a page is unclear or you need exact wording.

## When not to read the brain

- General questions that don't depend on this project (syntax, a library's API, a definition). Answer directly.
- Small, self-contained edits where the file in front of you has all the context.

Reading costs tokens. Skip it when it won't change the answer.

## Writing to the brain

- Never edit, move or delete anything in `sources/`. It's the record.
- One topic per page, named in lowercase with dashes: `brain/launch-checklist.md`.
- Every page ends with a `Sources:` line listing the files it came from.
- Quote exact wording like this, so the linter can check it against the source:
  `> the exact sentence (source: sources/call-notes.md)`
- Link pages with `[[page-name]]`. Add every new page to `brain/INDEX.md` with one line on what it answers.
- Keep pages under about 1,500 words. Split them when they grow.
- Keep `brain/NOW.md` under 60 lines: this week's focus, open decisions, things to avoid. Move old items into pages.
- Record decisions with the date and the reason, not just the outcome.

## Ingest: only what changed

1. Run `python3 brain_kit.py changed`.
2. If it says nothing is new, stop. There's nothing to pay for.
3. Process only the files it lists: update or create pages, then INDEX.md, then NOW.md if priorities moved.
4. Run `python3 brain_kit.py lint` and fix every error.
5. Run `python3 brain_kit.py mark`.

## Answering a question

- Start with `python3 brain_kit.py context "the question"` if you can run commands; it returns NOW, INDEX and the most relevant pages within a token budget.
- Say which pages you used. If the brain doesn't cover it, say so instead of guessing.
- If you learn something durable while working (a decision, a rule, a fix), add it to the right page before you finish.

## Spending

- Use the cheapest model that can do the task. Escalate only when it's clearly not enough.
- Keep reasoning effort low by default.
- For long sources, summarise each one separately, then merge the summaries. Don't paste everything into one prompt.
- Let scripts do the checking: character counts, links, markup, tests, `brain_kit.py lint`. Don't ask a model to grade its own work.
- Before any change that's hard to undo: back up, dry-run, then write.
