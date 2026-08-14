# TuneView — REW Measurement Viewer

A read-only, easy-to-use web viewer for [REW](https://www.roomeqwizard.com/)
measurement files (`.mdat`). Think of it as a cleaner "All SPL" tab plus a
dedicated impulse view, with upload/admin behind a password.

Deployed at **tune.redtruckaudio.com**.

## Features

- **SPL viewer** — overlay measurements on a log-frequency chart. SPL is
  **always shown at 1/6-octave smoothing** (pre-smoothed on upload).
- **Impulse viewer** — impulse response per measurement, toggle between
  **dBFS** and **% FS**, peaks aligned at t = 0 for easy comparison.
- **Grouping** — measurements are auto-classified by band (High / Mid / Low /
  Sub) and channel (L / R / Pair / Full), sorted High → Mid → Low → Sub then
  L → R. Group presets (Final, Crossover, Full-range, Pairs) select the right
  set in one click, keyed off the `FINAL` / `XO` / `FULL` / `PAIR` naming REW
  measurements use.
- **Upload / List / Admin** — upload `.mdat` files, browse tunes, delete them.
  Upload and admin are protected by HTTP Basic Auth.

## How it works

`.mdat` files are Java object-serialization streams. `src/lib/java/deserialize.ts`
is a from-scratch JOSP parser; `src/lib/rew/parseMdat.ts` walks the object graph,
extracts each `MeasData` (SPL magnitude, frequency axis, impulse `SampledData`),
applies 1/6-octave smoothing, and decimates the impulse around its peak. The
compact result is stored as JSON in Vercel Blob so the viewer stays fast.

Raw files upload directly to Blob from the browser (bypassing the serverless
body-size limit); a server route then fetches, parses, and stores the processed
tune.

## Development

```bash
npm install
vercel env pull .env.local   # BLOB_READ_WRITE_TOKEN, AUTH_USER, AUTH_PASS
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access (auto-set when the store is linked) |
| `AUTH_USER` / `AUTH_PASS` | Credentials for the upload & admin pages |

Auth is enforced in `src/proxy.ts` for `/upload`, `/admin`, and the write APIs.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · uPlot · Vercel Blob.
