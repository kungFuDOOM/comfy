# Hushbell

*Somewhere soft is waking up.*

A cozy, original island village life-sim for the browser. The Long Frost has put **Sugarlily Isle** into a snowy nap; the Hush Bell in its lighthouse has wound down. Wake the island one small kindness at a time until the Bell rings again. Brew coffee at the café, shop for pink and cheetah-print outfits,
decorate your yard, make friends with animal neighbors, collect little treasures, wander the island, and release soft
**Afterglow Lanterns** that drift to a hillside grove. (Farming is just one tiny garden plot.)

All art is **drawn in code** (Three.js, canvas, CSS) — there are no image files or downloaded art assets. The only bundled font is Fredoka (SIL Open Font License).

**Trailer:** [trailer/hushbell-trailer.mp4](trailer/hushbell-trailer.mp4) (74 s, made entirely in-engine; see [tools/trailer](tools/trailer/README.md)).

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

## Starting out

The game opens on a **main menu** over a live, slowly drifting view of Sugarlily Isle (lanterns rising, petals on the breeze).

- **New Game** plays a short arrival intro (about 35 seconds): a balloon ride in over the island, then Mimsy shuffles over to say hello. It plays once per new save and can be skipped at any moment.
- **Continue** appears when a save exists and goes straight into play, with no intro.
- **Settings** (separate **Music** and **Sound effects** sliders, controls reference) and **Credits** work with every input device.

Skipping the intro: `Esc`, the controller's **B**, or the on-screen **Skip** pill always skip. Before Mimsy starts talking, `Space` / `Enter` / **A** / a click or tap skip too; once she is talking they finish the line and move to the next one.

## Controls

Play with a keyboard and mouse, a controller, or touch. On-screen button hints follow whichever device you used last, and the in-game help (`H`, or the **? Help** button) puts that device's card first.

### Keyboard & mouse

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Walk (smooth, camera-relative) |
| Shift | Hold to run |
| E / Space | Talk, shop, interact with what you are facing |
| F | Use the selected hotbar item on the tile in front |
| Click | Walk there, or interact with a villager, shop, garden tile or yard tile |
| 1–9 / Q R / mouse wheel | Select a hotbar slot |
| B | Bag and wardrobe |
| J | Journal (quests, collection, friends, lanterns) |
| L | Lantern grove |
| H | Help |
| Esc | Pause menu (resume, journal, settings, back to title) · closes a window |
| `[` `]` · `-` `=` | Orbit the camera · zoom (Backspace resets) |

### Controller (Gamepad API, standard mapping)

| Input | Action |
| --- | --- |
| Left stick | Walk; a small tilt strolls, a full tilt runs (radial deadzone) |
| A | Talk, shop, interact |
| B | Hold to run · cancel · close a window |
| X | Use the selected hotbar item on the tile in front |
| Y | Bag and wardrobe |
| LB / RB | Previous / next hotbar slot (switch tabs inside a window) |
| Start | Pause menu |
| View (Select / Back) | Bag |
| D-pad | Move the focus ring in menus (left / right also steps the hotbar while walking) |
| Right stick · LT / RT | Orbit and tilt the camera · zoom (click the stick to reset) |

Controllers can be plugged in or removed at any time; a small toast confirms it. Most browsers only report a controller after its first button press.

### Touch

The touch overlay appears only when touch is in use, and is just two things:

| Input | Action |
| --- | --- |
| Drag on the left half | Floating joystick, appears under your thumb; a gentle drag walks, a full drag runs |
| **A** (bottom, green) | Talk, shop, interact |
| **B** (right, red) | Hold to run · cancel |
| **X** (left, blue) | Use the selected hotbar item |
| **Y** (top, yellow) | Bag and wardrobe |
| Tap a hotbar slot | Switch tools |
| Tap the island | Walk there, or talk to who you tap |

The journal, bag and help are also on the buttons at the top of the screen. The pause menu (resume, settings, back to title) is the **Pause menu** row at the bottom of the Journal. The layout respects notches and home-indicator insets in portrait and landscape.

### Menus and windows

Every menu and window works with all three: D-pad / stick / arrow keys move the pink focus ring, **A** / `E` / `Enter` confirms, **B** / `Esc` goes back or closes, **LB RB** / `Q R` switch tabs, and on touch you simply tap.

## Music and sound

All music and sound effects are **original and synthesized live** with the Web Audio API: no audio files or samples. A small step sequencer (`src/audio/sequencer.ts`) plays seven looping compositions written as data (`src/audio/tracks.ts`), and a director (`src/audio/director.ts`) crossfades between them:

| Where | Track |
| --- | --- |
| Main menu | *Pink Morning Doorbell* |
| Arrival intro | *Balloon Drift* |
| Town, morning/daytime | *Sugarlily Stroll* (a flute layer at dawn, a counter-melody and fuller percussion later in the day) |
| Town, evening | *Lantern Hour* |
| Town, night | *Starlit Hollow* |
| Café panel | *Steam & Saucers* |
| Boutique panel | *Runway Bounce* |

Sound effects (clicks, panel open/close, footsteps by surface, pickups, pips, gifts, brew-done, quests, and per-villager dialogue blips) are triggered from the real game events. Browsers keep audio off until the first tap, key or controller button, so the music starts then. Audio pauses while the tab is hidden and returns at your saved volumes. The **Music** and **Sound effects** sliders (Settings, from the main menu or the pause menu) persist in `comfy.settings.v1`; an old single `volume` setting seeds both.

For testing, `?input=keyboard|gamepad|touch` pins the prompt style, `?scene=game` skips the menu and `?scene=intro` replays the intro.

The game follows your local clock for the time of day and the real calendar month for the season. Progress autosaves in your browser (localStorage).
