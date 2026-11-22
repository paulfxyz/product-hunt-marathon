# Contributing

Thank you for taking the time to look at this project. The Product Hunt Marathon repository is a public monorepo that documents twelve free, open-source tools launched between 10 and 21 November 2026, and the logbook and tooling built around them. It is maintained by one person, so this guide tries to make a good contribution easy and a poor one unlikely.

Repository: https://github.com/paulfxyz/product-hunt-marathon
Homepage: https://tphm.io

## What lives where

The repository has three parts, and it helps to know which one you are touching.

- `tphm.io/` is the permanent logbook: static HTML, CSS and vanilla JavaScript, with no framework and no bundler. Most contributions will land here.
- `ph.paulfleury.com/` is the first launch hub, kept as a historical record. It is now a redirect to tphm.io. See its own README for how to browse the old versions.
- `social-manager/` is a cleaned, code-only snapshot of the PH Social Manager: a React, Vite and TypeScript client with an Express server.

The twelve tools themselves each live in their own repository, and each of the eleven Marathon launches has a page at `https://tphm.io/<repo>` (the Tetris bonus lives at its own site). Bugs in a tool belong in that tool's repository, not here.

## Reporting an issue

Open an issue on GitHub. A useful report usually contains:

1. What you expected to happen and what happened instead.
2. The page or file involved, with the full URL or path.
3. The language you were viewing, if the problem is about text. The logbook is published in English, French, Mandarin Chinese and Hebrew, and the archived hub in ten languages.
4. Your browser and operating system, and whether you use a screen reader, reduced motion or a high-contrast setting.
5. A screenshot, if it helps. Please remove anything personal first.

Accessibility problems are first-class bugs here. If something is hard to read, hard to reach with a keyboard, or noisy for someone who has asked for reduced motion, please say so.

If you need to reach Paul privately, for example about a security concern, use the contact form at https://paulfleury.com/contact. Please do not post secrets, tokens or personal data in a public issue.

## Proposing a fix

1. Fork the repository and create a branch with a short, descriptive name.
2. Make the smallest change that solves the problem. Bugs first, then the smallest useful change, is the order this project prefers.
3. Run the checks that apply to the part you changed (see below).
4. Open a pull request that says what changed, why, and how you checked it. Screenshots help for visual changes.

If you are planning something larger than a fix, such as a new chapter or a new tool in the build pipeline, please open an issue first so that we can agree on the shape of it before you spend your time.

## Running locally

### The logbook (`tphm.io/`)

You need Python 3. Start the local server from inside the folder:

```bash
cd tphm.io
python3 tools/serve.py 8931
```

Then open http://127.0.0.1:8931. The server mimics the clean URLs defined in `.htaccess`, so `/hunt` resolves to `hunt/index.html` as it does in production. A plain static server will not do this, which is why the script exists.

After you change a template or the plain-language source, rebuild:

```bash
python3 tools/build.py && python3 tools/simple.py
```

`tools/build.py` writes one static HTML file per page and language, each with its own URL, title, description, canonical link, hreflang tags and Open Graph data. A `VER` constant in that script busts caches, so bump it when you change shared assets that browsers might hold on to.

### The social manager (`social-manager/`)

Install the dependencies with npm from inside the folder, then use the scripts that the project defines:

```bash
npm run dev     # tsx watch server/dev.ts
npm run build   # vite
npm run check   # tsc
npm test        # tsx --test
```

Run `npm run check` and `npm test` before opening a pull request. The snapshot ships only seven generic tests, so new behaviour should come with a new test where that is practical. The owner address in the snapshot is the placeholder `owner@example.com`. Please leave it as a placeholder.

### The archived hub (`ph.paulfleury.com/`)

It is served as plain files. From inside the folder:

```bash
python3 -m http.server
```

Then open `archives/index.html` through that server. See `ph.paulfleury.com/README.md` for the rest.

## Translations: keep every language complete

A page that is half translated is worse than one that is clearly in one language, because it breaks the reading flow for exactly the people the translation was meant to help. The rule is therefore simple: every language ships complete, or the change waits.

For the logbook, the pipeline is:

1. `tools/harvest.py` visits every page with Playwright, clicks through the interactive states and collects every English string into `assets/i18n/keys.json`.
2. `tools/translate.py` translates `keys.json` into French, Mandarin Chinese and Hebrew through OpenRouter. A writer model drafts and a separate reviewer model checks, and the results are cached in `assets/i18n/<code>.json`.
3. `tools/build.py --prerender` bakes the translations into the HTML.

If you change English text, re-run the harvest so the new strings are captured, and make sure every language file has an entry for them before you open the pull request. If you read one of these languages and a translation reads badly, a correction to the relevant `assets/i18n/<code>.json` file is very welcome. Right-to-left layout for Hebrew is part of this: check that your change still reads correctly when mirrored.

The translation script needs your own OpenRouter access. Supply it in your local environment and never commit it (see the next section).

## Never commit credentials

This applies without exception. Do not commit API keys, tokens, passwords, session secrets, FTP details, `.env` files or database dumps, even in a branch you intend to delete, because git history is permanent and forks keep copies.

- Production deployment is FTP over TLS to shared hosting. Those credentials are not in the repository and never will be.
- The social manager uses owner-only password sign-in with salted scrypt, server-side sessions and Secure, HttpOnly cookies. Do not add real passwords or session data to any fixture or test.
- If you believe you have committed a secret by mistake, revoke it with the provider first, then tell Paul through https://paulfleury.com/contact.

## Style rules

These keep the writing consistent across the repository.

- British English: colour, behaviour, organisation, licence (noun), analyse.
- No exclamation points, anywhere: not in documentation, not in interface text, not in commit messages.
- No emojis, no hype and no chains of em dashes. Say what something does, say what it costs or where it falls short, and stop.
- Be specific and honest. Do not add numbers, features or claims you cannot point to. If you are unsure of a fact, leave it out.
- Product Hunt observations in the field notes are Paul's own experience, not documented Product Hunt policy. Please keep that distinction when editing.
- Explain why as well as how. This project exists partly to teach, so a short sentence of reasoning is usually worth more than another line of instructions.

### Accessibility

The logbook offers reading aids, reduced motion, readable contrast and a simple page with narration. A contribution should not make any of these worse.

- Respect `prefers-reduced-motion`. Anything that animates must have a calm alternative.
- Keep text contrast readable in both the light and dark themes.
- Everything interactive must work from the keyboard and have a visible focus state. Use real buttons and links rather than clickable containers.
- Give images useful alternative text. Decorative images should be marked as such.
- If you change the plain-language source (`src/simple.json`), remember that the narration is recorded from it. Flag in your pull request that the audio needs re-recording, and do not hand-edit generated files.

## Commits

Write commit messages in the imperative and keep the first line short: "Fix hreflang for Hebrew chapter pages", not "fixed stuff".

AI-assisted work is welcome. This project was itself built with an AI pair-programmer, with Paul directing, reviewing and taking responsibility for the result. If an AI tool helped you, that is fine, provided you have read, understood and tested what you are submitting. Credit it with a `Co-authored-by` trailer at the end of the commit message, using the name and address format that GitHub documents for co-authors. Commits in this repository made with Perplexity are co-authored in this way.

You remain responsible for the change. "The assistant wrote it" is not a reason to skip review.

## Licence and rights

- Code is released under the MIT licence (see the `LICENSE` file at the root). By contributing code, you agree that your contribution is released under the same licence.
- Written content, photos, the kitty illustrations and the narration audio are (c) Paul Fleury, all rights reserved unless stated otherwise. Please do not add third-party images or text without clear permission and a note of where it came from.
- Product names belong to their owners.
- Product Hunt is a trademark of its owner. This project is not affiliated with or endorsed by Product Hunt.

## Questions

If something here is unclear, open an issue and say which part. Improving this guide is a perfectly good first contribution.
