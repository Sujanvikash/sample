# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `frontend/sample/` — the only code so far: a React 19 + Vite 8 app, still close to the stock `create-vite` React (JavaScript) template.
- `backend/` — empty placeholder; no backend stack has been chosen yet.

The workspace root is not a git repository.

## Frontend commands

Run from `frontend/sample/`:

```sh
npm install        # install dependencies
npm run dev        # Vite dev server with HMR
npm run build      # production build to dist/
npm run preview    # serve the built dist/ locally
npm run lint       # ESLint over the whole project
npx eslint src/App.jsx   # lint a single file
```

There is no test runner configured (no Vitest/Jest), so there are no test commands yet.

## Frontend architecture

- Entry chain: `index.html` → `src/main.jsx` (mounts `<App />` inside `StrictMode` into `#root`, imports global `src/index.css`) → `src/App.jsx` (imports `src/App.css`).
- Plain JavaScript/JSX, ES modules (`"type": "module"`); no TypeScript, router, state library, or API layer yet.
- Assets: files in `src/assets/` are imported as modules and bundled; files in `public/` are served from the site root (e.g. `App.jsx` references SVG sprites as `/icons.svg#<id>`).
- `vite.config.js` uses only `@vitejs/plugin-react` (Oxc-based); the React Compiler is not enabled.
- ESLint uses the flat config (`eslint.config.js`): `@eslint/js` recommended, `react-hooks` recommended, and `react-refresh` (Vite preset), with browser globals; `dist/` is ignored. The `react-refresh` rule expects component files to export only components, so keep non-component exports in separate modules.
