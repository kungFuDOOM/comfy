# Comfy

A cozy, original island village life-sim for the browser. Brew coffee at the café, shop for pink and cheetah-print outfits,
decorate your yard, make friends with animal neighbors, collect little treasures, wander the island, and release soft
**Afterglow Lanterns** that drift to a hillside grove. (Farming is just one tiny garden plot.)

All art is **drawn in code** (canvas, CSS) — there are no image files, downloaded assets, or bundled fonts.

See [DESIGN.md](DESIGN.md) for the design, the lantern hook, villagers, seasons and roadmap.

## Play locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (the game is served under `/comfy/`).

## Build

```bash
npm run build     # type-checks, then builds to dist/
npm run preview   # serve the production build locally
```

The Vite `base` is `/comfy/` for GitHub Pages. A workflow in `.github/workflows/deploy.yml` builds and deploys on pushes to `main`.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Walk |
| Tap / click | Walk there, or interact with a villager, shop, garden tile or yard tile |
| E / Space | Talk, use, till, plant, water, harvest, place, open shops |
| 1–9 / mouse wheel | Select hotbar slot |
| B | Bag and wardrobe |
| J | Journal (quests, collection, friends, lanterns) |
| L | Lantern grove |
| H | Help |
| Esc | Close a window |

The game follows your local clock for the time of day and the real calendar month for the season. Progress autosaves in your browser (localStorage).
