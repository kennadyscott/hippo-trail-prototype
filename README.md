# Hippo Trail prototype

KnowHippo's math intervention ("Hippo Trail", working name), as a clickable prototype.

- A switcher at the top changes who you are viewing as:
  - **Student** (`index.html`): the KnowHippo student site with the climb. Its header, art and type are copied from the live site (kh.cleark12.com, November 26, 2026), with a gold "power-up climb" look of its own. Counting & Cardinality plays Levels 1–4; Base Ten Place Value plays Level 1.
  - **Teacher** (`public/teacher.html`): the teacher view, with class overview, growth, students, small groups and accelerated instruction (example class).
  - **CMS** (`public/cms.html`): the publishing CMS with the skill map, paths, lesson builder and review (mockup).

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
| `public/teacher.html`, `public/cms.html` | The teacher and CMS views (static pages) |
| `src/khi/` | Copied CMS lesson code (tools, rules, builder) |
| `src/data/knowhippo-intervention-map.json` | The skill map: 17 categories, 219 K–5 skills |

Pushing to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`).
