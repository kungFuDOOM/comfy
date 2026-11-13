# Hushbell — Design Document (v0.1 skeleton)

*Somewhere soft is waking up.*

## 0. The story

Sugarlily Isle was once the sweetest stop in the Pastel Sea. Then the **Long Frost** came and wouldn't leave, and the clockwork heart of the island, the **Hush Bell** in the lighthouse, wound down. Shutters stayed closed, flowers folded up, and the animals curled into their burrows for a long snowy nap. You arrive by balloon in **Cocoa Leaf** season (autumn, Sep–Nov). Waking the island means relighting its warmth one small kindness at a time (brewing, gifting, decorating, collecting, releasing lanterns) until the Hush Bell rings again.

**The friends of Hushbell**

- **Brioche Crumbleton**, a tubby capybara barista who believes every problem can be solved with a warm pastry. *(Moves in at Sprinkle Meadow.)*
- **Dottie Spotwhisk**, a cheetah-spotted hamster who runs the boutique and has strong opinions about hats. *(Playable slot: id `zuzu`.)*
- **Oolie Wisperwing**, a shy pastel moth who collects pressed flowers and whispers her favorite ones. *(Moves in at Blossom Grove.)*
- **Tuppi Frostwiggle**, a blush-cheeked axolotl baker who dreams in frosting and giggles when it wiggles. *(Moves in at Lilypad Pond.)*
- **Nimbus**, a fog-puff bunny who only appears at dusk and loves to hear about your day. *(Playable slot: id `nimbus`, keeper of the Afterglow Grove, which stays in town.)*
- **Marlo Seaglass**, a new friend: a sugar-dusted seal who keeps the lighthouse and hums to the sleeping Hush Bell. *(Moves in at the Hush Bell Overlook.)*

Brioche, Oolie, Tuppi and Marlo are real 3D villagers with journal portraits, dialogue, gifts and a small intro quest each. They are absent (shown as “Still napping…” in the Journal) until their area opens, then they move in at their home spot. **Mimsy Brindlewick** hosts, and **Bramble Tumbledown** tends the garden. Save ids stay stable across renames.

A cozy, original island village life-sim for the browser. You arrive on **Sugarlily Isle**, a pink-and-pastel island
with a café, a boutique, a little yard of your own, a tiny garden, shorelines to comb, and a hillside where lanterns gather.

## 1. Pillars

1. **Cute & cozy first.** Soft shapes, rounded UI, gentle sounds-of-silence pacing. No fail states, no timers that punish, no stamina bar.
2. **Original.** Every name, character, item, place and drawing is invented for this game. All art is generated in code (canvas, CSS), including the cheetah print.
3. **Pink, pastel and cheetah.** Palette is blush, bubblegum, cream, lavender and mint. Cheetah print (drawn procedurally in two colorways) is an occasional accent: a handful of wardrobe pieces, the boutique, rugs, chairs, mugs and lanterns. Most clothes use other prints (gingham, polka, stars, strawberries, lace…).
4. **Coffee + shopping + friends.** The heart of the game is brewing drinks, dressing up, and being kind to neighbors.
5. **Not a farming game.** Gardening is one small side loop with a four-by-three plot. Every other loop gets equal design weight.
6. **Everything feeds everything.** Loops are connected by pips (currency), items, friendships and the Afterglow Lanterns hook.

## 2. Core loops (equal weight)

| Loop | What you do | What it feeds |
| --- | --- | --- |
| **Café** | Buy ingredients, brew drinks (Pink Puff Latte, Honey Cloud Cappuccino, Spotted Mocha), serve them to villagers | Friendship, Steam Lanterns, quests, pips (selling) |
| **Boutique & outfits** | Try on for free; mix and match 400+ pieces across hat / top / bottom / dress / shoes / bag / face slots in 29 styles; the boutique restocks 10–16 pieces daily; buy decor | Spotted Lanterns, pips sink, identity |
| **Decorating** | Place/pick up decor in your fenced yard (a 10×4 lawn) | Hearth Lanterns, self-expression |
| **Friends & gifting** | Talk once a day, give gifts, serve drinks; each villager has liked items | Hearts, new dialogue tiers, Ribbon Lanterns |
| **Collecting** | Pick up Dewdrop Shells, Ribbon Blossoms, Steam-Moths, Starlit Buttons; fill the collection log | Sparkle Lanterns, gifts, pips |
| **Exploring** | Wander paths, beaches, the meadow and the grove hillside; spawns depend on place, time of day and season | Everything above |
| **Garden (side loop)** | Till → plant → water → harvest, on a few-real-minutes timescale | Sprout Lanterns, gifts (villagers like crops), pips |

Currency is **pips** (the little star coin). Pips come from selling at the Tuppence Cart, quests, and set rewards; they go into ingredients, seeds, outfits and decor.

### Controls

Three equal input paths funnel into one action layer (`src/input`): interact, tool, cancel/run, bag, journal, hotbar.

- **Keyboard & mouse:** WASD / arrows walk (smooth, camera-relative), Shift runs (also the rest of a click-to-walk), `E`/Space interacts, `F` uses the selected item, `1–9` / `Q R` / wheel pick a hotbar slot, `B` bag, `J` journal, `L` lantern grove, `H` help, `Esc` closes windows. Click to walk or interact.
- **Controller:** left stick walks (a full tilt is still a walk), A interact, B hold-to-run (also a tap-walk) and closes windows, X use item, Y bag, LB/RB hotbar, Start journal, View bag, D-pad menu focus. Hot-pluggable.
- **Touch:** a floating joystick plus an A/B/X/Y diamond, nothing else. B hold-to-run also covers a tap-walk. Tap the hotbar to switch tools. Only shown while touch is in use.

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

The grove sits on the northeastern hillside around a lavender altar, looked after by **Nimbus Hollowell**, the fog-puff bunny. Each lantern takes the next
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
| **Dottie Spotwhisk** (id `zuzu`) | Cheetah-spotted Hamster | Hat-opinionated boutique boss. Runs Spot & Bow. Dramatic and kind. | Boutique front | Spotted Mocha, Steam-Moth |
| **Bramble Tumbledown** | Marshmallow Hedgehog | Grumpy-sweet gardener. Names every sprout. | Garden | Puffberry, Cottonbloom |
| **Nimbus Hollowell** | Fog-puff Bunny | Gentle lantern keeper who only appears at dusk and loves to hear about your day. | Lantern grove | Starlit Button, Honey Cloud Cappuccino |

**Friendship.** Each villager has 0–100 points shown as up to 5 hearts (20 points each). Talking once per day gives +6. A liked gift/drink gives +20; a neutral drink +8; a neutral gift +4.
One gift and one drink per villager per day. A pink speech bubble with a heart floats over villagers you have not chatted with today.

**Friendship hearts (v2).** Each friend has 10 hearts (20 points each, saved in `state.friend`; old 5-heart saves keep their points). Chat once a day (+6), give one gift a day (loved +24, liked +12, neutral +4, disliked +0; double on their birthday), finish their request (+40) and attend event days (+20). Tastes are discovered by gifting or from letters (`state.bonds.known`). Every friend has a real-calendar birthday (confetti trickle, a Wish button, a thank-you letter). Hearts 2, 4, 6, 8 and 10 put a letter in the mailbox by the yard (and a HUD envelope chip), often with a gift. At 10 hearts a friend gives a unique outfit piece (`clothes/catalogFriends.ts`) or café recipe (`Recipe.friend`). Chat lines warm up with hearts. Data: `friendData.ts`; logic: `friends.ts`; UI: `ui/friendsUi.ts` (Journal Friends tab, Mailbox). New save field `bonds` is optional and normalized in `save.ts`.

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
5. **Wardrobe and yard** grow as you shop. Some pieces are never sold (quest, skill and crafting rewards). Completing a region (area open, resident friend's intro quest done, one of every gather kind collected there) earns its exclusive party hat; all six earn the Island Star hat. Change outfits from Bag › Wardrobe or the Home Wardrobe by the house.

## 7. Technical notes

- Vite + TypeScript, plain 2D canvas for the world, DOM for HUD/panels. `base: '/comfy/'` for GitHub Pages.
- `src/` modules: `world` (map, tiles, buildings), `player` (movement, BFS click-to-move), `npc`, `cafe`, `boutique`, `decorate`, `garden`, `collect`, `lanterns`, `inventory`, `quests`, `questlog`, `skills`, `nodes`, `time`, `save`, `state`, `ui/*`, and `art/*` (characters, icons, decor, lanterns, cheetah print).
- Save/load: one JSON blob in localStorage (`comfy.save.v1`), autosaved every 5 s and on tab hide/close. It holds position, inventory, hotbar, pips, friendships, plots, decor, worn clothes and owned wardrobe, lanterns, quests, stats and collectible spawns. Plants keep growing while the tab is closed (progress uses timestamps).
- No backend, no external assets.
- Player activity animations: game code calls `startAct()` (`src/actions.ts`); fishing casts and bench brewing are mirrored from their timers. `render/playerActs.ts` blends procedural poses over idle/walk, hangs cached tool props on the hands only while needed, and plays splashes, chips, drops and sparkles through the pooled celebration particles. Moving (keys, stick, joystick or tap-to-walk) cancels an act; held acts (the bake games) end with their window. Visual only, nothing saved.

## 7b. Soft Skills

Skills *wrap* the existing cozy loops; they never replace them. Gardening, gifting, brewing, decorating and lanterns stay equal-weight ways to play. Everything here is original to Hushbell — there is **no combat, no stamina, no energy bar and nothing to lose**.

- **Six skills:** Foraging, Fishing, Gardening, Baking, Brewing, Crafting (level cap 25, XP to next level = 40 × level^1.6). Total XP is saved; the level is derived. The Journal's *Skills* tab (or `K`, or the HUD "✧ Skills" button) shows each level and XP bar.
- **Gathering nodes (~90):** placed by the map generator on valid ground from `NODE_SPECS` — starter tier in and near town (Ribbon Meadow, sugarwood stumps, the south shore), higher tiers (lanternberries, moonpetals, starfreckle shrubs, rosepearl beds, deeper fish) in the farther areas. Gather with the interact button; a spot rests for a while (timestamps persist) and looks bare until it blooms back. Higher tiers need a skill level; the deeper fishing spots also need the Dew-line Rod.
- **Softkeep Chest:** a 48-slot chest in the yard by home. The bag holds 24 stacks; when it is full a new kind of item goes to the chest with a gentle toast, so nothing is ever lost. Tools stay in the bag.
- **Recipes with levels:** the café counter (*Brew*), café oven (*Bake*) and standalone Crafting Table by the boutique (*Craft*) share one short timer. Locked recipes stay visible, greyed, with the skill and level they need — e.g. Lanternberry Latte (Brewing 5), Cloud Cake (Baking 8), Moonpetal Pin (Crafting 8).
- **Mimsy's Soft Errand:** the starter quest. Mimsy asks for 3 puffberries from the bushes in Ribbon Meadow (next to town) and rewards 60 pips and the Dew-line Rod, teaching gathering and opening up fishing.

## 7c. A bigger island (gated areas)

The island is now 96×80 tiles (~2.7× the original land). Only **Sugarlily Town** is open at the start: café, boutique, home, yard, garden, the square, Ribbon Meadow (starter bushes and sugarwood stumps), the Afterglow Grove hill and a long south shore with starter-tier shells and fish. Every other area is walled off by a cute barrier (solid tiles; examine it with the interact button) and opens for good once its requirement is met. Unlocks persist in `unlocked` in the save.

| Area | Barrier | Opens with | Friend who moves in |
|---|---|---|---|
| **Blossom Grove** (dense pink forest, moonpetals, lanternberries) | Fallen blossom logs (west road) | Foraging level 3 | Oolie (moth) |
| **Lilypad Pond** (freshwater pond fishing) | Broken bridge over the river (north of the square) | Quest: Mimsy's *Mend the Bridge* (craft 3 Sugarwood Planks, 2 Sugarwood Twigs each) | Tuppi (axolotl) |
| **Sprinkle Meadow** (wide flower meadow, picnic) | Pink locked gate (east road) | Pay 120 pips | Brioche (capybara) |
| **Hush Bell Overlook** (cliff, lighthouse) | Soft fog veil past the pond | Brewing level 3 | Marlo (seal) |
| **Pearl Shore** (long far beach, rosepearl shells, moonlit fish) | Seaside gate (south-east road) | Pay 250 pips | none (scenery and rare finds) |

- Code: `areas.ts` (area and barrier data), `unlocks.ts` (requirements, messages, `unlockArea`), `world.ts` (the map generator: regions, river, pond, tree/fence walls, node placement from `NODE_SPECS` in `data.ts`), `render/barriers.ts` (barrier models). `npc.ts` `syncNpcs()` keeps the cast in line with what is unlocked.
- Celebration hooks for a polish pass: `onAreaUnlocked(id)` and `onFriendArrived(id)` in `unlocks.ts`, plus the open/close switch in `render/barriers.ts`.
- Saves from the 60×44 island are migrated on load: the old map sits inside the new one shifted by `TOWN_OFFSET`, and positions, decor and garden plots move with it. A player who lands somewhere blocked or locked is placed back in the square.

## 7d. Seasonal events

Events are declarative (`src/events.ts`): id, name, real start and end dates (local time, inclusive), a peak day, banner text, a list of exclusive wardrobe and decor ids, activities with milestone rewards, an optional in-world decoration (`world`) and interactable `spots`. Register a new event in `src/events/index.ts`.

- **Helpers:** `getActiveEvents()`, `isEventActive(id)`, `isPeakDay(id)`, `getUpcomingEvents()`, `bumpEvent()`, `grantEventItem()` (refuses when the event is off, so exclusives can only be earned while it runs and are kept forever).
- **Save:** `state.events[id]` holds counters, claimed milestones and flags. It is created on demand, so older saves load untouched (key stays `comfy.save.v1`).
- **UI:** a HUD banner with "Ends in N days" (tap to open the journal), and a journal Events tab listing current, upcoming and past events with dates.
- **QA preview:** `?event=<id>` forces an event on and treats its peak day as today; `?date=YYYY-MM-DD` pretends it is that day (also moves seasons and the daily stock). Example: `?event=harvest&date=2026-11-22` previews a regular event day.

**Harvest Hush Feast** (`id: harvest`, Nov 20 to Nov 30 2026, feast day Nov 26): autumn dressing of Sugarlily Square (leaf garlands, paper-lantern strings, pumpkins, a long feast table); pumpkins, apples and cinnamon (found around the island or in the café pantry); pie baking at the café oven as a three-step timing game with no failing (two perfects bake a Golden Pie); every villager adores pies as gifts; on Nov 26 all friends sit at the table and the feast scene plays, ending in a group thank-you and rewards. 10 exclusive outfits and 3 decor pieces.

**Twinkle Season** (`id: twinkle`, Nov 27 to Dec 26 2026, `peakDay` Dec 25): a snowy winter event in dated chapters. The island looks snow-covered for the whole season (the event's `season: 'snowfluff'` makes the renderer use the Snowfluff look, visual only, so late November is snowy too) and twinkle lights are strung from the lamps and along slim posts beside the main roads. Chapters (`EventDef.chapters`, gated by `eventDay()`, so `?date=` and `?event=` work; earlier weeks' activities stay open to catch up, new content only unlocks on its start date, and every reward is only granted while the event is active):
- **Week 1, Nov 27:** the town tree appears in the square; decorate it in three steps (garland, ornaments, topper; each a pick of three, saved and shown on the tree). Outfits and the Tiny Twinkle Tree.
- **Week 2, Dec 4:** cookie baking at the café oven (`events/cookieBake.ts`, its own three-tray heat-timing game; two golden trays bake a bonus cookie; closing the window clears every timer and bakes nothing). Gingersnap spice and peppermint appear in the pantry.
- **Week 3, Dec 11:** the ornament hunt (finds on dry walkable ground only, same rules as other finds) and the cocoa market stall south of the square (three cups for pips).
- **Week 4, Dec 18:** gift exchange: a gift to a friend (once per friend) earns a Candy Cane Charm and pips back.
- **Dec 24 and Dec 25:** Christmas Eve and Christmas Day gatherings: every villager stands round the tree (`events/twinkleSeats.ts`, separate from the harvest feast seating) and a short cutscene plays (`events/gathering.ts`) with a reward set each. Dec 26 ("Afterglow") keeps the snow, lights and every earlier activity but has no gathering.
Each chapter pays an exclusive outfit and a decor piece (10 outfits and 6 decor pieces in all).

Generic framework pieces added for it: optional `EventDef.chapters` / `EventActivity.chapter` (the journal shows the current chapter and what is locked, the HUD banner uses the chapter line), `EventDef.season`, `EventWorld.signature()` (the event layer rebuilds a world when the calendar day or that signature changes), and per-event banner copy (`peakTitle`, `peakSub`; two active events show two banner lines, e.g. Harvest and Twinkle overlap Nov 27 to 30).

QA preview examples:
- `?event=twinkle` is Christmas Day (peak); `?event=twinkle&date=2026-11-27` week 1; `...&date=2026-12-04` week 2; `...&date=2026-12-11` week 3; `...&date=2026-12-18` week 4; `...&date=2026-12-24` Christmas Eve; `...&date=2026-12-25` Christmas Day; `...&date=2026-12-26` Afterglow.
- `?date=2026-11-27` shows both Harvest and Twinkle (overlap); `?date=2026-11-19` shows neither.

## 8. Roadmap beyond v0.1

- **v0.2 — Nooks.** Unlock the Moonlit Reading Nook and Lantern Terrace from lantern sets; a proper walk-in house interior with room-by-room decorating.
- **v0.3 — Café depth.** Customer orders, latte-art mini-game, café upgrades, a seasonal drink menu and a favorite drink per villager.
- **v0.4 — Boutique depth.** Dye colors and a dress-up photo mode (mix-and-match slots, styles and colour variants landed earlier).
- **v0.5 — Friends.** Event days with each villager, letters in the mailbox, friendship milestones, more villagers (a shy otter-ish baker, a sleepy bat who loves night markets).
- **v0.6 — Island growth.** Starwatch Hill, a lighthouse cove, fishing-free "tide pool" collecting, more collectible sets with museum-style display.
- **Polish.** Soft music and ambient sound, weather, accessibility options (reduced motion, larger text), gamepad support, in-game settings and save export.
