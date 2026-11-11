# Comfy — Design Document (v0.1 skeleton)

A cozy, original island village life-sim for the browser. You arrive on **Sugarlily Isle**, a pink-and-pastel island
with a café, a boutique, a little yard of your own, a tiny garden, shorelines to comb, and a hillside where lanterns gather.

## 1. Pillars

1. **Cute & cozy first.** Soft shapes, rounded UI, gentle sounds-of-silence pacing. No fail states, no timers that punish, no stamina bar.
2. **Original.** Every name, character, item, place and drawing is invented for this game. All art is generated in code (canvas, CSS), including the cheetah print.
3. **Pink, pastel and cheetah.** Palette is blush, bubblegum, cream, lavender and mint. Cheetah print (drawn procedurally in two colorways) shows up on outfits, the boutique, rugs, chairs, mugs and lanterns.
4. **Coffee + shopping + friends.** The heart of the game is brewing drinks, dressing up, and being kind to neighbors.
5. **Not a farming game.** Gardening is one small side loop with a four-by-three plot. Every other loop gets equal design weight.
6. **Everything feeds everything.** Loops are connected by pips (currency), items, friendships and the Afterglow Lanterns hook.

## 2. Core loops (equal weight)

| Loop | What you do | What it feeds |
| --- | --- | --- |
| **Café** | Buy ingredients, brew drinks (Pink Puff Latte, Honey Cloud Cappuccino, Spotted Mocha), serve them to villagers | Friendship, Steam Lanterns, quests, pips (selling) |
| **Boutique & outfits** | Try on for free, buy and wear pink and cheetah-print outfits; buy decor | Spotted Lanterns, pips sink, identity |
| **Decorating** | Place/pick up decor in your fenced yard (a 10×4 lawn) | Hearth Lanterns, self-expression |
| **Friends & gifting** | Talk once a day, give gifts, serve drinks; each villager has liked items | Hearts, new dialogue tiers, Ribbon Lanterns |
| **Collecting** | Pick up Dewdrop Shells, Ribbon Blossoms, Steam-Moths, Starlit Buttons; fill the collection log | Sparkle Lanterns, gifts, pips |
| **Exploring** | Wander paths, beaches, the meadow and the grove hillside; spawns depend on place, time of day and season | Everything above |
| **Garden (side loop)** | Till → plant → water → harvest, on a few-real-minutes timescale | Sprout Lanterns, gifts (villagers like crops), pips |

Currency is **pips** (the little star coin). Pips come from selling at the Tuppence Cart, quests, and set rewards; they go into ingredients, seeds, outfits and decor.

### Controls

Three equal input paths funnel into one action layer (`src/input`): interact, tool, cancel/run, bag, journal, hotbar.

- **Keyboard & mouse:** WASD / arrows walk (smooth, camera-relative), Shift runs, `E`/Space interacts, `F` uses the selected item, `1–9` / `Q R` / wheel pick a hotbar slot, `B` bag, `J` journal, `L` lantern grove, `H` help, `Esc` closes windows. Click to walk or interact.
- **Controller:** left stick walks, A interact, B run/cancel, X use item, Y bag, LB/RB hotbar, Start journal, View bag, D-pad menu focus. Hot-pluggable.
- **Touch:** a floating joystick plus an A/B/X/Y diamond, nothing else; tap the hotbar to switch tools. Only shown while touch is in use.

Prompt glyphs follow the last device used. The game opens on a main menu (New Game / Continue / Settings / Credits); New Game plays a skippable arrival intro once per save.

## 3. The hook: Afterglow Lanterns

> Meaningful moments in *any* loop can release a soft paper lantern unique to that activity. Lanterns drift up to the hillside
> **lantern grove** and form a little constellation. Completing small sets unlocks new cozy nooks and town areas.

### 3.1 Moments → lanterns

| Moment | Lantern | Look (drawn in code) |
| --- | --- | --- |
| Serving a coffee drink to a villager | **Steam Lantern** | Peach paper with a pair of coffee-steam wisps |
| Gifting an item a friend likes | **Ribbon Lantern** | Bubblegum pink with a white bow |
| Placing a decor piece | **Hearth Lantern** | Lavender with a tiny glowing house |
| Finding a collectible | **Sparkle Lantern** | Mint with a star |
| Trying on / buying a boutique outfit | **Spotted Lantern** | Cream-and-rose with a cheetah-print trim band |
| Harvesting in the garden | **Sprout Lantern** | Pale green with a leaf |

Rules (so lanterns stay special, never a chore):

- The **first moment of each kind each (real) day always releases a lantern.**
- Further moments of that kind the same day have a 30% chance, capped at 4 per kind per day.
- Disliked or neutral gifts rarely release one; a *liked* gift always counts as a moment.
- A lantern is created the instant the moment happens, saved immediately, and flies to the grove over a few seconds (a flying lantern is a visual only; if you close the tab it is simply already in the grove next time).

### 3.2 The grove and constellation

The grove sits on the northeastern hillside around a lavender altar, looked after by **Nimbus Hollowell**. Each lantern takes the next
free slot along a gentle curved path above the altar; settled lanterns are connected by faint dashed lines, and a few dim "star" dots
show the slots still waiting. The grove glows brightest at night. The journal's *Lanterns* tab shows a preview of the same sky, per-kind counts and set progress.

### 3.3 Sets and future unlocks

| Set | Requirement | Reward in v0.1 | Planned unlock |
| --- | --- | --- | --- |
| **First Light Cluster** | One lantern of every kind | 100 pips | **Moonlit Reading Nook** — a cozy hillside nook with a seat and bookshelf |
| **Ribbon Constellation** | Three of every kind | 250 pips | **Lantern Terrace** — a rooftop patio for the café with evening service |
| **Sky Full of Wishes** | 30 lanterns total | 500 pips | **Starwatch Hill** — a new town area with a telescope, stargazing and rare steam-moths |

In v0.1, sets complete, pay out, and announce that the nook/area is "arriving in a future update"; the unlocks themselves are later work.

### 3.4 Save data

`state.lanterns` (id, kind, timestamp), `lanternSeq`, `setsDone`, and the per-day counters (`daily.lanternKinds`) are all persisted to localStorage.

## 4. Villager roster

All animal friends are original designs drawn in code. Each has a liked-item pair, a bio, three dialogue tiers by friendship, and a line for each time of day.

| Villager | Animal | Personality | Home | Likes |
| --- | --- | --- | --- | --- |
| **Mimsy Brindlewick** | Fluff-eared Dormouse | Sleepy sweetheart. Café regular, naps with her eyes open. | Café patio | Pink Puff Latte, Ribbon Blossom |
| **Zuzu Spotswood** | Spotted Cheetah Cub | Bold boutique diva. Runs Spot & Bow. Dramatic and kind. | Boutique front | Spotted Mocha, Steam-Moth |
| **Bramble Tumbledown** | Marshmallow Hedgehog | Grumpy-sweet gardener. Names every sprout. | Garden | Puffberry, Cottonbloom |
| **Nimbus Hollowell** | Moon Owl | Gentle lantern keeper and storyteller. | Lantern grove | Starlit Button, Honey Cloud Cappuccino |

**Friendship.** Each villager has 0–100 points shown as up to 5 hearts (20 points each). Talking once per day gives +6. A liked gift/drink gives +20; a neutral drink +8; a neutral gift +4.
One gift and one drink per villager per day. A pink speech bubble with a heart floats over villagers you have not chatted with today.

## 5. Day cycle and seasons (real world time)

**Day cycle** follows the player's local clock: morning (5–10), day (10–17), evening (17–20:30), night (otherwise). The sky is a smooth multiply-tint
that interpolates through dawn pink, bright daytime, golden evening, dusk rose and a soft lavender night. At night, lamp posts and windows glow and the grove lanterns shine brighter.
The clock and phase are shown in the HUD. Steam-Moths only appear in the evening and at night.

**Seasons** follow the real calendar month, with original names:

| Season | Months | Look | Island effect |
| --- | --- | --- | --- |
| **Blossom Bloom** | Mar–May | Pink blossom trees, drifting petals | Ribbon Blossoms ×2 |
| **Sunsip Days** | Jun–Aug | Mint trees, glowing sparkles | Dewdrop Shells ×1.8, more moths |
| **Cocoa Leaf** | Sep–Nov | Peach leaves, golden grass | Café-cozy season (cosmetic in v0.1) |
| **Snowfluff** | Dec–Feb | Frosted lavender trees, snowfall | Starlit Buttons ×2.5 |

For testing you can add `?hour=21.5&month=12` to the URL to override the clock and month.

## 6. Progression

v0.1 has a gentle, open-ended ladder instead of levels:

1. **Starter quests** (journal): brew a drink, serve it, try on an outfit, give a gift, find 3 collectibles, place decor, release a lantern, harvest a crop. Each loop is represented; quests pay pips and a few items.
2. **Friendship hearts** unlock warmer dialogue tiers.
3. **Collection log** fills in as you find things.
4. **Lantern sets** are the long-term goal and unlock nooks/areas later.
5. **Wardrobe and yard** grow as you shop.

## 7. Technical notes

- Vite + TypeScript, plain 2D canvas for the world, DOM for HUD/panels. `base: '/comfy/'` for GitHub Pages.
- `src/` modules: `world` (map, tiles, buildings), `player` (movement, BFS click-to-move), `npc`, `cafe`, `boutique`, `decorate`, `garden`, `collect`, `lanterns`, `inventory`, `quests`, `time`, `save`, `state`, `ui/*`, and `art/*` (characters, icons, decor, lanterns, cheetah print).
- Save/load: one JSON blob in localStorage (`comfy.save.v1`), autosaved every 5 s and on tab hide/close. It holds position, inventory, hotbar, pips, friendships, plots, decor, outfit, lanterns, quests, stats and collectible spawns. Plants keep growing while the tab is closed (progress uses timestamps).
- No backend, no external assets.

## 8. Roadmap beyond v0.1

- **v0.2 — Nooks.** Unlock the Moonlit Reading Nook and Lantern Terrace from lantern sets; a proper walk-in house interior with room-by-room decorating.
- **v0.3 — Café depth.** Customer orders, latte-art mini-game, café upgrades, a seasonal drink menu and a favorite drink per villager.
- **v0.4 — Boutique depth.** Mix-and-match slots (hat, top, shoes, accessories), dye colors, cheetah-print variants, dress-up photo mode.
- **v0.5 — Friends.** Event days with each villager, letters in the mailbox, friendship milestones, more villagers (a shy otter-ish baker, a sleepy bat who loves night markets).
- **v0.6 — Island growth.** Starwatch Hill, a lighthouse cove, fishing-free "tide pool" collecting, more collectible sets with museum-style display.
- **Polish.** Soft music and ambient sound, weather, accessibility options (reduced motion, larger text), gamepad support, in-game settings and save export.
