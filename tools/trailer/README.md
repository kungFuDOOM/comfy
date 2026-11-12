# Trailer tooling

Everything in the trailer is the game itself: shots are staged in the live Three.js world, the music and sound effects are the game's own synthesized tracks, and the UI shots are the real Journal and level-up sticker. Nothing here ships with the game.

| File | What it does |
| --- | --- |
| `driver.ts` | The shot list. Each shot is a camera move, a pose for the player and villagers, and staged moments (a gate unlock, a berry gathered, lanterns rising). Every frame depends only on the shot's local time. |
| `timeline.cjs` | The edit: when each shot plays, the captions, the music sections and the sound cues. The montage cuts land on the bar lines of *Sugarlily Stroll* (108 bpm). |
| `capture.cjs` | Renders frames through headless Chromium (software WebGL) with the page's clock frozen, so each frame is exact. `scout` renders three stills per shot for framing. |
| `audio.cjs` + `audio.ts` | Renders the soundtrack offline with an `OfflineAudioContext`, using the game's sequencer, tracks and `sfx`. |
| `ui.cjs` | Captures the Journal's Skills tab and the level-up stickers. |
| `overlays.cjs` | Renders captions, the title and the end card as transparent PNGs in Fredoka. |
| `assemble.py` | Cuts frames to the timeline, layers the overlays, and muxes the audio into an MP4 (needs Python 3 with Pillow and numpy, and ffmpeg). |
| `vite.config.ts` | A dev server on port 5174 with hot reload off, so editing a file can't reload a page mid-render. |

## Rebuild the trailer

```bash
npx vite --config tools/trailer/vite.config.ts &      # capture server on :5174
export TRAILER_URL=http://localhost:5174/comfy/
W=/tmp/trailer
node tools/trailer/capture.cjs scout $W/scout           # optional: framing stills
node tools/trailer/capture.cjs frames $W/frames frost-wide,frost-town,balloon,title-aerial,cafe,boutique,friends,forage,fish,unlock,seasons,grove,lighthouse,end
node tools/trailer/audio.cjs $W/soundtrack.wav
node tools/trailer/ui.cjs $W/ui
node tools/trailer/overlays.cjs $W/overlays
python3 tools/trailer/assemble.py $W trailer/hushbell-trailer.mp4
```

Software rendering runs at about 5 s a frame at 1280×720. Split the shot list across a few `capture.cjs frames` processes to run them in parallel.
