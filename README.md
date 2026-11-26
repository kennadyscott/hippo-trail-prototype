# Hippo Trail prototype

KnowHippo's math intervention ("Hippo Trail", working name), as a clickable prototype.

- **Student view** (`index.html`): the KnowHippo student site with a Hippo Trail.
  - Built from the live site's own markup, styles and art (kh.cleark12.com, copied November 26, 2026).
  - Counting & Cardinality plays Levels 1–4. Base Ten Place Value plays Level 1. Higher levels show which tool they are waiting on.
- **Publisher and costs** (`plan.html`):
  - The CMS lesson builder: edit, preview as a student, approve.
  - AI cost from the CMS AI cost log.
  - Build time at three depths, and which path to build first.

The lessons, manipulatives, checking, hints and practice rules are the CMS code from `ck12-CMS-V2` (branch `knowhippo-intervention`, PR #778, on hold), copied into `src/khi`. Nothing here talks to the CMS or the database. Progress and saved lessons stay in the viewer's browser.

## Run it

```bash
npm install
npm run dev
```

## Where things are

| Path | What |
|---|---|
| `src/student/` | Student view: `App.tsx` (pages), `Lesson.tsx` (five steps, help ladder, practice rules), `Chrome.tsx` (KnowHippo header) |
| `src/student/kh-live.css`, `src/student/art/` | Copied from the live site; re-copy rather than edit |
| `src/plan/` | Publisher view and the cost pages |
| `src/khi/` | Copied CMS lesson code (tools, rules, builder) |
| `src/data/knowhippo-intervention-map.json` | The skill map: 17 categories, 219 K–5 skills |

Pushing to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`).
