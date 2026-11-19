# Sunset Cover Studio

![Bounty](https://make.fun/badge/gta6-cover-art-01.svg)
![Rank](https://make.fun/badge/gta6-cover-art-01/isyaweb-a11y/sunset-cover-studio/rank.svg)
![Reward](https://make.fun/badge/gta6-cover-art-01/isyaweb-a11y/sunset-cover-studio/reward.svg)

An entry for the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).
Found make.fun through a referral? Start here: https://make.fun/r/sc1d8ke0

Sunset Cover Studio turns your own photos and a caption into GTA-poster-style
multi-panel cover art, entirely in the browser: slanted poster panels, sunset
and neon colour grades, big gradient display lettering, and one-click PNG
exports in the three sizes people actually post. Everything runs offline from
static files — your photos are read on your own machine and never uploaded.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080. No build step, no install, no network.

## What it does

- **Photos** — add several of your own (file picker or drag-and-drop onto the
  cover), or start from the five built-in demo photos, all made with an image
  model for this app.
- **Six panel layouts** — Hero, Angled Split, Trio, Quad, the five-panel
  Poster Collage and the six-panel Mosaic, all with GTA-style leaning dividers
  and thin light borders, drawn as clipped polygons on canvas.
- **Per-panel arranging** — click a panel (or its button) to select it, assign
  any loaded photo to it, drag on the preview to reposition, zoom with the
  slider or the mouse wheel, fill every panel with one photo, and override the
  colour grade per panel.
- **Six colour grades** — Vice Sunset, Neon Nights, Noir, Golden Hour, Teal
  Chrome and Clean, each a canvas filter recipe plus a blended light wash,
  with an intensity slider and optional film grain and vignette.
- **Poster lettering** — an editable title and subtitle set in Anton with
  gradient chrome fills (Sunset Chrome, Neon Pink, Gold, Ice, Paper White), a
  heavy dark stroke, drop shadow and a slight italic skew, finished with
  hand-drawn palm silhouettes and a retro sun disc (all original canvas art —
  no Rockstar logos, artwork or fonts anywhere).
- **Exports** — one click renders the cover offscreen at full resolution and
  downloads a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080. The editor's
  live preview is the same drawing at half size, so what you see is the post.
- **Screenshot scenes** — a `?shot=` query renders a deterministic cover or a
  pre-loaded editor for the maker's screenshots; see `shots.json` for the four
  scenes behind the images in `screenshots/`.

## Layout of the code

- `app/index.html` + `app/style.css` — the editor page and its styling.
- `app/src/main.js` — editor state and UI wiring (photos, panels, exports).
- `app/src/layouts.js` — the six slanted panel layouts as unit-space polygons.
- `app/src/grades.js` — the colour-grade recipes and their light overlays.
- `app/src/lettering.js` — Anton poster lettering, palms and the sun disc.
- `app/src/render.js` — the one renderer behind both preview and PNG exports.
- `app/src/shots.js` — the deterministic `?shot=` screenshot scenes.
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to the
  output directory, validates them, and writes `dossier.json`.

## Credits

- Display font: **Anton** by Vernon Adams, Cyreal and Jacques Le Bailly,
  licensed under the SIL Open Font License 1.1 — the font file and its license
  ship in `app/fonts/` (`Anton-Regular.ttf`, `OFL.txt`).
- Sample photos in `app/samples/` were generated with an image model for this
  app and are free to use.
- License for this repository: see `LICENSE` (MIT).
