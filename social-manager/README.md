# PH Social Manager

PH Social Manager is the private editorial workspace used to prepare and track every Product Hunt, X and LinkedIn post during The Product Hunt Marathon.

It covers:

- A calendar of posts.
- Platform-style previews.
- Editable copy.
- Revision notes and history.
- Artwork selection.
- Readiness status.
- "Posted" receipts, recorded manually.

It cannot publish or schedule posts. Everything in the campaign was posted by hand.

## What this copy is

This is a cleaned code snapshot, not the working instance. The following were left out of the public copy:

- Campaign data, and the tests that check campaign copy
- Private assets
- Internal notes
- Deployment scripts

You get the application code only, starting with an empty workspace.

## Stack

- React, Vite and TypeScript on the front end
- Express on the server
- SQLite, hosted on Fly.io
- Owner-only password sign-in, using salted scrypt hashing, server-side sessions and Secure, HttpOnly cookies

## Local setup

```
npm install
cp .env.example .env
npm run dev
```

Check `package.json` for the full list of scripts.

## Owner email placeholder

The owner email is a placeholder: `owner@example.com`, in `server/app.ts`, `server/fly-store.ts`, `server/migration.sql` and `client/main.tsx`. Change it to your own before you use the app, since sign-in is restricted to a single owner.

## Publication boundaries

- The code is public. The campaign it was used for is not part of this folder.
- No credentials are included. Provide your own through `.env`.
- Deployment scripts are not included, so you will need to set up your own hosting.
- The app prepares and records posts only. It does not connect to Product Hunt, X or LinkedIn to publish anything.
