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
| **Decorating** | Step through the Front Door into your home and arrange decor on an 8×6 grid (place, drag, turn, pick up), pick wallpaper and floors; or place/pick up decor in your fenced yard (a 10×4 lawn) | Hearth Lanterns, self-expression |
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

**Photo mode** (`P`, or the 📷 HUD button): hides the HUD, frees the camera (drag / pinch / wheel / arrows / right stick: full orbit, low angles, close-ups), and opens a soft tool sheet: seven poses (reusing the activity animator, `render/playerActs.ts`), four faces (`Expression` in `render/actors.ts`) and a turn, six filters (warm, pastel, film, dreamy bloom, rosy), six frames and ten draggable stickers (all drawn in code, `art/photoArt.ts`). The shutter bakes filter + frame + stickers into a PNG (`photo.ts` → `composeShot`) shown on a review card with *Save PNG* and *Keep in album*. The album stores only small JPEG thumbnails in `state.photos` (capped at 12, optional in older saves, sanitized in `save.ts`). Esc / B / P leave; input is locked to photo mode meanwhile (`setInputLock` in `input/dispatch.ts`).

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

**Friendship hearts (v2).** Each friend has 10 hearts (20 points each, saved in `state.friend`; old 5-heart saves keep their points). Chat once a day (+6), give one gift a day (loved +24, liked +12, neutral +4, disliked +0; double on their birthday), finish their request (+40) and attend event days (+20). Tastes are discovered by gifting or from letters (`state.bonds.known`). Every friend has a real-calendar birthday (confetti trickle, a Wish button, a thank-you letter). Hearts 2, 4, 6, 8 and 10 put a letter in the mailbox by the yard (and a HUD envelope chip), often with a gift. At 10 hearts a friend gives a unique outfit piece (`clothes/catalogFriends.ts`) or café recipe (`Recipe.friend`). Chat lines warm up with hearts (see 4a). Data: `friendData.ts`; logic: `friends.ts`; UI: `ui/friendsUi.ts` (Journal Friends tab, Mailbox). New save field `bonds` is optional and normalized in `save.ts`.

### 4a. Conversations

Chatting is a short, tap-through conversation instead of a single random line. Each friend has a full **voice** (`src/talk/voices/<id>.ts`): Mimsy drowsy and motherly ("sunbeam"), Dottie dramatic fashion bulletins ("darling", then "bestie"), Bramble clipped and secretly soft ("Hmph."), Nimbus calm and full of questions about your day ("dear"), Brioche bustling and pastry-first ("crumb"), Oolie whispering and shy but braver at high hearts, Tuppi all giggles and wiggles, Marlo reading out lighthouse log entries. Each friend also has their own blip pitch (`audio/sfx.ts`).

- **Shape:** the day's first chat is a hello for your heart tier (0-1, 2-4, 5-7, 8-10 hearts), one to three topics and a goodbye (a night one after dark). Later chats are quicker, and after about seven in a day a friend gently runs out of words until tomorrow. Some topics ask you something, with two or three reply pills and a reaction to each (no points involved). The reply is remembered, and a later chat sometimes mentions it (`{answer}` in that friend's `recall` lines).
- **What they react to** (`src/talk/engine.ts`, `src/talk/context.ts`): hearts, the season the island looks like, today's weather (rain, snow, rainbow; Twinkle Season counts as snowy), time of day plus the small hours, holidays (Halloween week, the run-up to the Harvest Hush Feast, feast season and feast day, the "is it snowing yet" weeks, each Twinkle Season chapter, Christmas Eve and Day, Afterglow, an Advent countdown in sleeps, New Year, Valentine's Day), their own and friends' birthdays, what you did since you last talked (fishing, baking, decorating, contests, pet care...), skill level-ups this session, the gift you gave them earlier, their quest-log request and board errands, one-time news (a newly opened area, your new pet) and the traveling merchant's visits. Feast day and Christmas gathering chatter (`events/pieLines.ts`, `events/twinkleText.ts`) is part of the mix. The older short lines (`lines`/`phase` in `data.ts`, `mid`/`close`/`best` in `friendData.ts`) stay in the small-talk pool.
- **Gifts:** replies come from per-friend pools for loved / liked / neutral / disliked items, with lines for specific favorites preferred, warmer teasing for dislikes at 6+ hearts, its own "one a day" replies, and lines for holiday cookies (pies keep their feast words). A birthday gift adds their birthday thanks.
- **No repeats too soon:** every line has a stable id; the last 36 per friend are remembered and skipped while fresh lines remain (then the one said longest ago comes back). A topic with only stale lines is rarely picked.
- **Window** (`ui/talkUi.ts`, `ui/talk.css`): animated portrait that hops while talking, a typed bubble with name tag, progress dots and a ▼ / ✿ hint, a mood sticker per line (☔ 🎄 🥧 💖 ...), a floating "+6 friendship" chip, reply pills, and a big Chat / Give / Bye bar with a gift drawer. Tap the bubble or portrait (or A / E / Space) to finish a line, then again for the next one.
- **Save:** optional `talk` (`recent` line ids, `since` stat snapshots, `once` news ids, last `gift` per friend, `answers` as question-id to reply index, never the words), sanitised and capped in `save.ts`. Older saves get an empty one; the key stays `comfy.save.v1`. Friendship points are unchanged.
- **QA:** `?date=2026-11-26` (feast day), `?date=2026-12-10` (countdown and cocoa week), `?event=twinkle` (Christmas Day), `?weather=rain|snow|rainbow`, `?hour=2` (small hours).

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

**Weather** (`src/weather.ts`, `render/weatherLayer.ts`, `ui/hud.ts`). Each real (or `?date=`) day gets a seeded roll: sunny, cloudy, or a wet day with a rain window (snow when the island looks wintry, including Twinkle Season, which keeps drawing its own snowfall). Wet days run roughly 18–32% by season; after a shower a rainbow lingers for ~2.5 daylight hours about half the time. Nothing is saved; it is a pure function of the date and clock, so no save fields were added. Visuals are all GPU-friendly: instanced puddles with ripples, point-sprite rain streaks and snow (fewer on touch screens), drifting cloud shadows, an overcast sky/fog/sun grade plus a wet rim-light sheen, and a CSS rainbow arc (the camera looks down at the island, so a 3D rainbow would never be in view). Petals and fireflies hush in the rain, and a soft filtered-noise rain loop follows the SFX volume. The HUD clock chip shows a drawn weather icon (moon at night). Gameplay: rain waters every planted crop; 30% of rain-time catches become a Drizzle Darter / Cloudcap Carp; Bellyflop Frogs (near water) and Dewdrop Snails spawn while it rains or the rainbow is up and wander off when it clears. Test with `?weather=sunny|cloudy|rain|snow|rainbow`.

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

## 7a. Home decorating

The **Front Door** station (south face of the house) opens decorate mode: a fade into a dollhouse-style room (`render/homeRoom.ts`, a `home` scene on the shared renderer, floating far above the island so nothing else is in shot) and a tray UI (`ui/homeUi.ts`, `ui/home.css`). Rules live in `home.ts`, data (8×6 grid, 5 wallpapers, 5 floors, patterns painted in `art/homePatterns.ts`) in `homeData.ts`. The yard keeps its own tile decorating.

- Items come from the bag (any `kind: 'decor'` item); placing consumes one, picking up returns it. One standing piece per cell; flat pieces (rugs) share a cell with a standing piece. Pieces rotate in quarter turns.
- Mouse: hover shows a ghost, click places / selects, drag moves. Touch: tap to place or select, drag to move, big Turn / Pick up buttons; the tray docks to the right on short landscape screens. Keyboard: arrows move a cursor, E/Space confirm, `R` turn, `X` pick up, `[ ]` flip through pieces, `Tab` next tab, Esc back. Gamepad: D-pad / stick cursor, A confirm, X turn, Y pick up, LB/RB flip, Start next tab, B back (deselect, then leave). Extra scene buttons arrive on the bus as `sceneAction`.
- Save: `state.home = { wall, floor, items: [{ id, x, y, rot }] }`, normalized on load (`normalizeHome`), so older saves get an empty blush-and-checker room. Saved after every change and on leaving.

## 7a-2. The traveling merchant

**Tansy Packlewick**, a lilac-cream Wandering Alpaca with a stuffed travel pack, visits on **Wednesdays and Saturdays, 9 AM to 8 PM** (real calendar and clock; `?merchant=1` keeps her open all day for QA, `?date=` and `?hour=` work too). She sets up a striped stall on a cobbled pitch east of Sugarlily Square (counter tiles are solid while she is there) and sells a rotating handful of rare things for pips: two outfit pieces (`clothes/catalogMerchant.ts`, source `merchant`, never in the boutique), two decor pieces (`d_m_*`), and two seed bundles (rare Lanternberry and Moonpetal seeds, plus discounted regulars). Arrival toast, a HUD chip ("Tansy is in town") and a poof of sparkles announce her; a toast says when she packs up and when she is next back (also in Help).

Data: `merchantData.ts` (schedule, offer pools, lines, save sanitiser), `merchantLayout.ts` (stall tiles), logic `merchant.ts`, UI `ui/merchantUi.ts`, 3D `render/merchant3d.ts` (+ the `alpaca` actor in `render/actors.ts`). Save field `merchant` (`visit` day key, `stock` with per-item `left`, `met`, `spent`, `seen`, `talked`) is optional: the stock is rolled once per visit from a seeded shuffle and stored, so reloading never re-rolls it or refills sold items. Older saves get defaults in `save.ts`.

## 7b. Soft Skills

Skills *wrap* the existing cozy loops; they never replace them. Gardening, gifting, brewing, decorating and lanterns stay equal-weight ways to play. Everything here is original to Hushbell — there is **no combat, no stamina, no energy bar and nothing to lose**.

- **Seven skills:** Foraging, Fishing, Gardening, Baking, Brewing, Crafting and Style (below) (level cap 25, XP to next level = 40 × level^1.6). Total XP is saved; the level is derived. The Journal's *Skills* tab (or `K`, or the HUD "✧ Skills" button) shows each level and XP bar.
- **Gathering nodes (~90):** placed by the map generator on valid ground from `NODE_SPECS` — starter tier in and near town (Ribbon Meadow, sugarwood stumps, the south shore), higher tiers (lanternberries, moonpetals, starfreckle shrubs, rosepearl beds, deeper fish) in the farther areas. Gather with the interact button; a spot rests for a while (timestamps persist) and looks bare until it blooms back. Higher tiers need a skill level; the deeper fishing spots also need the Dew-line Rod.
- **Softkeep Chest:** a 48-slot chest in the yard by home. The bag holds 24 stacks; when it is full a new kind of item goes to the chest with a gentle toast, so nothing is ever lost. Tools stay in the bag.
- **Recipes with levels:** the café counter (*Brew*), café oven (*Bake*) and standalone Crafting Table by the boutique (*Craft*) share one short timer. Locked recipes stay visible, greyed, with the skill and level they need — e.g. Lanternberry Latte (Brewing 5), Cloud Cake (Baking 8), Moonpetal Pin (Crafting 8).
- **Mimsy's Soft Errand:** the starter quest. Mimsy asks for 3 puffberries from the bushes in Ribbon Meadow (next to town) and rewards 60 pips and the Dew-line Rod, teaching gathering and opening up fishing.

- **Style (seventh skill) and styling contests:** friends who host (Mimsy, Dottie, Bramble, Nimbus, Brioche, Oolie, Tuppi, Marlo) offer one themed contest a day from their dialogue: Goth Picnic, Rodeo Date, Cozy Café Morning, Beach Day, Fairy Garden Tea, Snowfluff Stroll, Glitter Runway, Frosting Fête. She picks an outfit from her wardrobe; three judges (the host plus two neighbours) score it 1-5 stars against the theme. Every wardrobe piece carries contest *tags* (`clothes/tags.ts`), derived from its style, print, shape, extras and colour, plus optional per-item `tags`. Cheetah print is only a *small accent* bonus (one or two spotted pieces) in the Rodeo Date and Glitter Runway themes. Everybody earns a ribbon (Sprinkle, Blush, Berry, Golden Bow) plus pips, friendship and Style XP; nothing is ever lost. Golden Bows and Style levels 2/4/6/8/10/13/16/20/25 unlock outfit pieces (`clothes/catalogStyle.ts`); buying clothes gives a little Style XP too. Journal › Skills shows the Ribbon shelf. Rules: `contest.ts`; window: `ui/contestUi.ts`. Saved in `state.style` (`ribbons`, `hosted`, `entries`), defaulted and sanitized in `save.ts`, so older saves load untouched.

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
- **Cutscene runner:** `src/cutscene/runner.ts` plays declarative beat lists (camera, dialogue, waits, walk/face/emote, fx/sfx, `call`) for the feast and the Christmas gatherings; the balloon intro stays separate. Watched or skipped real plays are recorded in `seenCutscenes` (save field, ids like `harvest-feast`); rewards still use the event flags. `?cutscene=harvest-feast|christmas-eve|christmas-day|first-snowfall|tree-lighting|first-pie|golden-pie|first-pet|friend-moves-in` boots straight into play and previews that scene (no seen mark, no reward, no flags), filling in `?event=` / `?date=` from `cutscene/presets.ts` when the URL has none.

**Harvest Hush Feast** (`id: harvest`, Nov 20 to Nov 30 2026, feast day Nov 26): autumn dressing of Sugarlily Square (leaf garlands, paper-lantern strings, pumpkins, a long feast table); pumpkins, apples and cinnamon (found around the island or in the café pantry); pie baking at the café oven as a three-step timing game with no failing (two perfects bake a Golden Pie); every villager adores pies as gifts; on Nov 26 all friends sit at the table and the feast scene plays, ending in a group thank-you and rewards. 10 exclusive outfits and 3 decor pieces.

**Twinkle Season** (`id: twinkle`, Nov 27 to Dec 26 2026, `peakDay` Dec 25): a snowy winter event in dated chapters. The island looks snow-covered for the whole season (the event's `season: 'snowfluff'` makes the renderer use the Snowfluff look, visual only, so late November is snowy too) and twinkle lights are strung from the lamps and along slim posts beside the main roads. Chapters (`EventDef.chapters`, gated by `eventDay()`, so `?date=` and `?event=` work; earlier weeks' activities stay open to catch up, new content only unlocks on its start date, and every reward is only granted while the event is active):
- **Week 1, Nov 27:** the town tree appears in the square; decorate it in three steps (garland, ornaments, topper; each a pick of three, saved and shown on the tree). Outfits and the Tiny Twinkle Tree.
- **Week 2, Dec 4:** cookie baking at the café oven (`events/cookieBake.ts`, its own three-tray heat-timing game; two golden trays bake a bonus cookie; closing the window clears every timer and bakes nothing). Gingersnap spice and peppermint appear in the pantry.
- **Week 3, Dec 11:** the ornament hunt (finds on dry walkable ground only, same rules as other finds) and the cocoa market stall south of the square (three cups for pips).
- **Week 4, Dec 18:** gift exchange: a gift to a friend (once per friend) earns a Candy Cane Charm and pips back.
- **Dec 24 and Dec 25:** Christmas Eve and Christmas Day gatherings: every villager stands round the tree (`events/twinkleSeats.ts`, separate from the harvest feast seating) and a short cutscene plays (`events/gathering.ts`) with a reward set each. Dec 26 ("Afterglow") keeps the snow, lights and every earlier activity but has no gathering.
Each chapter pays an exclusive outfit and a decor piece (10 outfits and 6 decor pieces in all).

**Twinkle Advent Calendar** (`src/advent.ts`, `src/ui/adventUi.ts`): 24 doors, December 1–24, every year. The day is `today()` in `src/time.ts`, so `?date=` and a forced `?event=twinkle` (peak day December 25) are honored. Today's door and any earlier missed door can be opened; future doors stay locked. Catch-up lasts through December 25. December 26 the calendar can still be looked at, and after that it sleeps until next December. Each door gives one original treat, decor piece, or wardrobe item (December 24 gives the Starfall Hush Gown and the Midnight Bell Star). Open it from the town tree while Twinkle Season's tree is up, or from Journal › Events. A small HUD notice shows while today's door (or, on the 25th, a missed door) is still closed. Save: optional `state.advent = { opened: number[], year }` on the existing `comfy.save.v1` key; a missing field loads as no doors opened, and a new `year` starts the list over without taking gifts back. Preview with `?advent=open` (outside December 1–25 this pretends it is December 24). `?scene=game&advent=open` skips the menu and opens the calendar.

**Today card** (`src/today.ts`, `src/ui/todayUi.ts`): once each calendar day, when play loads (Continue, or a return from the title), a small panel lists the daily hooks already in the game: bulletin-board errands still open, one friend’s request or a hello/gift nudge, how many boutique pieces restocked (`dailyStock`), unread mail, and either an unopened advent door (`adventNotice`) or the active festival. A visit streak counts days in a row and simply starts over after a gap. Dismiss with a tap or **Tuck it away**; reopen from the **♡ Today** HUD chip or Journal. It uses the shared panel, so `body.panel-open` hides the touch controls. Save: optional `state.today = { lastShown, streak, lastDay }` on `comfy.save.v1`; a missing field is a fresh note. `?today=show` opens it even if it already opened today. `?date=` and `?event=` still choose the day. `?cutscene=` keeps the scene. `?advent=open` still opens the calendar unless `?today=show` is also set.

Generic framework pieces added for it: optional `EventDef.chapters` / `EventActivity.chapter` (the journal shows the current chapter and what is locked, the HUD banner uses the chapter line), `EventDef.season`, `EventWorld.signature()` (the event layer rebuilds a world when the calendar day or that signature changes), and per-event banner copy (`peakTitle`, `peakSub`; two active events show two banner lines, e.g. Harvest and Twinkle overlap Nov 27 to 30).

QA preview examples:
- `?event=twinkle` is Christmas Day (peak); `?event=twinkle&date=2026-11-27` week 1; `...&date=2026-12-04` week 2; `...&date=2026-12-11` week 3; `...&date=2026-12-18` week 4; `...&date=2026-12-24` Christmas Eve; `...&date=2026-12-25` Christmas Day; `...&date=2026-12-26` Afterglow.
- `?date=2026-11-27` shows both Harvest and Twinkle (overlap); `?date=2026-11-19` shows neither.

**Seasonal festivals** (four small events on the same framework, each far smaller than Harvest Hush Feast and much smaller than Twinkle Season: a short window, one main activity, 2 to 3 exclusives that are never sold, a journal banner and a few villager lines; no chapters or cutscenes; dated for the next real occurrence after November 2026). All preview with `?event=<id>` (peak day) or `?event=<id>&date=YYYY-MM-DD` (`?date=` wins). Shared helpers: `events/festivalKit.ts` (once-a-day spots, cheap 3D dressing, stall tile blocking). Progress lives in `state.events[id]` like the others, and `Holiday` in `talk/types.ts` gained `petalpicnic`, `shoredays`, `costumenight`, `warmcup` (1 to 2 lines per villager each; the existing `halloween` lines still play from Oct 25).
- **Petal Picnic Days** (`id: petalpicnic`, Apr 3 to Apr 11 2027, peak Apr 10): pink petals, a blossom garland and three picnic blankets on the square's lawn. Sit on a blanket to share a blossom treat (one per blanket per day, counter `picnics`, goal 5). Exclusives: Petal Picnic Bonnet, Petal Picnic Blanket (decor), Blossom Blanket Sundress.
- **Sunsip Shore Days** (`id: shoredays`, Jul 10 to Jul 18 2027, peak Jul 17): a striped lemonade stand in the square and sunny bunting. Main: find Glowday Shells on the sand (`EVENT_COLLECTIBLES`, goal 8); side: one free lemonade glass a day at the stand (goal 3). Exclusives: Lemon Ribbon Sunhat, Glowday Shell Sundress, Sunsip Lemonade Cart (decor).
- **Moonlit Costume Night** (`id: costumenight`, Oct 24 to Oct 31 2027, peak Oct 31; ends well before Harvest Hush on Nov 20): lavender-and-pink paper lanterns, pastel pumpkins, bobbing paper bats and a costume rack in the square. Try on the two costumes (you wear each as you try it, counter `costumes`); side: give gifts to three different friends (`treats`). Exclusives: Sleepy Ghost Hood, Paper Bat Cape, Sleepy Moon Lantern (decor). Soft and cute, not scary.
- **Warm Cup Market** (`id: warmcup`, Jan 15 to Jan 18 2027, peak Jan 16, after Twinkle Season ends): one cocoa stall in the square reusing the same three cups and panel as Twinkle's week-3 stall (`openCocoaCups` in `cocoaStall.ts`) but with its own event and counter, so Twinkle is untouched. Buy 3 cups. Exclusives: Warm Cup Poncho and Warm Cup Kettle (decor).

## 7e. Bulletin Board errands & Pet Care

- **Bulletin Board** (station `board`, in Sugarlily Square beside the Tuppence Cart; also on the map panel): 3 daily and 2 weekly errands posted by villagers who have moved in. They refresh on the real local day and Monday-based week (`?date=` applies). Errands are either *do N of something* (fish, gather, pick up finds, serve or brew drinks, bake, harvest, craft, gift, care for the pet) or *deliver N items* from the bag. Do-errands read the lifetime `stats` counters (progress = stat minus its value when posted), so no gameplay system needed changes. Rewards: pips, friendship points, skill XP, and a small gift for weekly ones; finishing all three dailies pays a sweep bonus. A toast greets the new board once a day and again when an errand becomes claimable. Code: `errandData.ts` (types, templates, sanitising), `errands.ts` (posting, progress, claiming), `ui/errandsUi.ts`.
- **Pet Care** (skill id `petcare`, listed with the other skills): pats, Play and Snack (a berry, tart or little fish) grow it; XP only pays for the first few of each per day (`petcare.ts`). Unlocks: Gold-star Bow (Lv 3), daily Treasure Sniff (Lv 5), Sunset Beret (Lv 8), Best-Friend Knit (Lv 12); care accessories are free and never sold. UI: a care card in the pet's corner, and a Play button on the pet card.
- **Save:** `errands` and `petCare` are new optional fields, defaulted and sanitised in `save.ts`; the key stays `comfy.save.v1`.

## 8. Roadmap beyond v0.1

- **v0.2 — Nooks.** Unlock the Moonlit Reading Nook and Lantern Terrace from lantern sets; a proper walk-in house interior with room-by-room decorating.
- **v0.3 — Café depth.** Customer orders, latte-art mini-game, café upgrades, a seasonal drink menu and a favorite drink per villager.
- **v0.4 — Boutique depth.** Dye colors and a dress-up photo mode (mix-and-match slots, styles and colour variants landed earlier).
- **v0.5 — Friends.** Event days with each villager, letters in the mailbox, friendship milestones, more villagers (a shy otter-ish baker, a sleepy bat who loves night markets).
- **v0.6 — Island growth.** Starwatch Hill, a lighthouse cove, fishing-free "tide pool" collecting, more collectible sets with museum-style display.
- **Polish.** Soft music and ambient sound, weather, accessibility options (reduced motion, larger text), gamepad support, in-game settings and save export.
- **First Snowfall:** `src/events/firstSnowfall.ts`. On the first login on/after Nov 27 (local date, while Twinkle Season is on) the scene plays once per save (`first-snowfall` in `seenCutscenes`, watched or skipped): a pink dusk ramping to a lavender evening, the lamps and light strings waking in a wave from the plaza (`setTwinkleLightWave`), the town tree twirling up (its bulbs, halo and aura live inside the named tree group so they rise with it), friends gasping, one flake landing on a nose, then the snow; the ground stays autumn (runner `seasonLook`) and the drifts hidden until a soft white-out, after which the square is snowy. The tree, drifts, strings and snow are the real ones from `twinkleWorld.ts`, handed back in `onFinish` (watched or skipped); no rewards.
- **Tree Lighting:** `src/events/treeLighting.ts`. Right after the third decorating step is picked in `twinkleTree.ts` (and any later pick while it is still unseen) the panel closes and `queueTreeLighting` starts the scene once per save (`tree-lighting` in `seenCutscenes`, watched or skipped). A save that already finished the tree also gets it on the next load while Twinkle Season is on, or the next visit to the tree, still only once. The queue holds a single pending start and waits out a reopened panel or another scene, so it can't double-fire. Friends wander in and gather round the tree while the camera creeps closer, everyone shouts 3, 2, 1 (a candy-coloured pop-in numeral, the tree shivers and lights a notch each count), then the tree blazes (`setTwinkleTreeGlow`: 0 unlit, 1 normal, up to 2) with a boing, a warm bloom and sparkles spiralling up the branches. No rewards and no new save field. Preview with `?cutscene=tree-lighting`: steps the save hasn't picked get render-only stand-in picks (`setTwinkleTreePickFill`) and the saved counters are never written. `onFinish` always restores the tree lights, scale, overlay and stand-in picks.
- **First Pie:** `src/events/firstPie.ts` (props and Brioche's stand-in in `pieStage.ts`). Plays once per save (`first-pie` in `seenCutscenes`, watched or skipped) on whichever comes first: the first login while the Harvest Hush Feast is on (`maybeStartFirstPie`, from `game.ts`, one pending check at a time) or the first time the pie-baking window is opened (`openPieBake` plays it, then opens the window). Brioche demos a pie at a pop-up oven and table in front of the café: rolling the dough into a crust (flour puffs), crimping the edge, plopping in the filling; the oven door drops open, the pie hops in and browns behind the window under a low close-up camera, then pops out onto the oven top with a ding, steaming. Opening it from the recipe list closes that list first. No rewards, no new save field. Everything staged (props, Brioche if her meadow is locked) is handed back in `onFinish`.
- **Golden Pie:** `src/events/goldenPie.ts`. The first Golden Pie bake (`finish()` in `pieBake.ts`) calls `queueGoldenPie`, which waits for the baking window to close and then plays a short reveal once per save (`golden-pie` in `seenCutscenes`): a faintly shimmering pie rises and spins in a ring of gold stars, splits into two with a burst of sparkles, and both settle on the bakery table glinting while Brioche cheers. Single pending start, no rewards. The pending reveal is stored on the harvest event flag `goldenReveal` (optional; older saves with a `goldenPies` count and no seen mark still qualify) so it plays on the next load if the game closed first. Preview with `?cutscene=first-pie` / `?cutscene=golden-pie`.

**Day-one guides** (small, on existing systems): the first Mimsy errand in `questlog.ts` is `lq_latte`, "Make Mimsy a Pink Puff Latte". It auto-starts once `seenHelp` is true and the screen is clear (`maybeStartLatteQuest`, polled from `game.ts` while no panel is open; saves that already have it in `questLog`, active or done, are left alone). While it is active the café's Pink Puff Latte row gets a soft "For Mimsy" highlight (`ui/guides.css`). Giving Mimsy the cup through the gift drawer completes it without a second `removeItem`; the Hand-it-over button still works. The Journal goal `q_adopt` ("A Little Friend", stat `adopted`) completes in `adoptPet`, and the first real adoption plays a short Pet Nook scene (`cutscene/firstPet.ts`, id `first-pet`, once per save in `seenCutscenes`). `?cutscene=first-pet` previews it (a stand-in kitten if there is no pet; nothing is saved or paid). No new save fields.

**Friend Moves In (COM-1).** At 8 hearts (`MOVE_IN_HEARTS` in `townHomeData.ts`, "Dear friends"; the 10-heart "Best friends" rewards stay separate) a friend whose area is open asks to live in a little cottage in town. Once per friend: the optional save field `movedIn?: string[]` (villager ids) is the record, sanitized in `save.ts` (unknown ids dropped; missing = nobody yet; the save key `comfy.save.v1` is unchanged). `hasMovedIn` in `npc.ts` still only means "their area is open"; `hasTownHome` / `homeOf` mean "they have a town house" and give a runtime home override (the door tile), so `VILLAGERS` is never mutated and friends wander near their cottage. Each friend has a fixed 3x3 plot of open town grass in `TOWN_HOMES` (clear of the café, boutique, your yard, the square, roads, stations and trees). `townHomes.ts` blocks the plot's tiles (dynamic blocks) for moved-in friends only, and `render/townHomesLayer.ts` draws `createCottage` (in `render/structures.ts`) for the same list, so saves without `movedIn` look exactly as before. The scene (`cutscene/friendMovesIn.ts`, id `friend-moves-in`) is shorter than Christmas Eve: the empty plot, the question, the house appearing, thanks. `maybeStartFriendMovesIn` (from `startGame`, never under `?cutscene=`) watches for ready friends and plays them one at a time on a clear screen (30 s apart; Nimbus waits for dusk). Watched or skipped both count: `completeMoveIn` pushes the id, sends the letter `<id>:movedin` (resolved by `letterView` from `TOWN_HOMES`, with a small gift), bumps the stat behind the journal goal `q_movein` (first move-in only, never backfilled) and re-seats the friend. `seenCutscenes` also gets `friend-moves-in`, but only as "this kind of scene was seen"; nothing reads it. Preview: `?cutscene=friend-moves-in` (`&friend=<id>`, default `mimsy`; add `&hour=20` for Nimbus). A preview uses a stand-in house and never writes `movedIn`, sends the letter, pays or marks anything seen.
