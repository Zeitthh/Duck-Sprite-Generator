# Duck Editor

A pixel-art editor for designing 8×8 / 16×16 animated ducks and exporting them as sprite sheets for Unity.
Built with Vite, React, TypeScript and Zustand. It runs entirely in the browser; no backend needed.

## Repository layout

| Folder   | Contents                                                              |
| -------- | --------------------------------------------------------------------- |
| `app/`   | The Duck Editor web app (Vite + React + TypeScript)                   |

> Note: code comments are written in Spanish.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer (22 recommended, which is what CI uses)
- npm (bundled with Node)

## Run it locally

```bash
cd app
npm install
npm run dev
```

## Other commands

Run these from the `app/` folder:

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm test`          | Runs the core unit tests (Vitest)               |
| `npm run typecheck` | Type-checks the project with `tsc`              |
| `npm run build`     | Type-checks and creates a production build in `app/dist` |
| `npm run preview`   | Serves the production build locally             |

## Generating sample data

The repository ships without sample ducks or exported sheets. You can generate them with the scripts in `app/scripts/`
(run from `app/`). The output goes to folders next to `app/` (`test-ducks/`, `exports/`), which are created on demand.

```bash
npx vite-node scripts/generate-test-ducks.ts   # 32 random ducks -> ../test-ducks/32-ducks.duck.json
npx vite-node scripts/generate-bird-ducks.ts   # themed ducks    -> ../test-ducks/aves-mexico.*
npx vite-node scripts/export-batch.ts          # sprite sheets   -> ../exports/<batch>/
```

Open any generated `*.duck.json` in the editor with the **Import** button; it adds the ducks to your project.


## Deploy to GitHub Pages

1. Push this repository to GitHub (branch `main`).
2. Go to **Settings → Pages → Source** and select **GitHub Actions**.
3. Every push to `main` runs the tests, builds `app/` and publishes it at `https://<user>.github.io/<repo>/`.

The workflow lives in `.github/workflows/deploy.yml`. The Vite `base` is set to `./`, so the build works under any repository path.
