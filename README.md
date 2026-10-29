# River Rat

**Play now:** https://stevenwsharp-ctrl.github.io/River-Rat/

A whitewater game for computer and phone. Run real stretches of real rivers in a raft, kayak, dory or inner tube.

## Files

Put all of these files in the root of your GitHub repository (15 code files, `sw.js`, `manifest.webmanifest`, 3 icon PNGs and this README):

| File | What it does |
|---|---|
| `index.html` | The page, the screens and the styles. |
| `rivers.js` | River data: rapids, camps, history markers, bridges, towns, crowds and boats. |
| `world-rivers.js` | Rivers on every continent: Zambezi, Mana Pools, Futaleufú, Pacuare, Soča, Sun Kosi, Ganges, Franklin, Kaituna and the Onyx (Antarctica). |
| `game.js` | The core game: physics, 2D view, controls, leaderboards, history pages. |
| `trip.js` | Overnight and Expedition modes: camps, crew, supplies, boats in your trip, events, camp scene, save and continue. |
| `scenes.js` | Animated painted scenes for history pages, stops, take-outs and dangers. |
| `three-d.js` | The 3D view near big rapids, landmarks and bridges. |
| `scenery.js` | Real scenery for each river: black schist bluffs and cliff jumpers at Black Rocks, cottonwoods, tamarisk, the railroad and train, debris fans, boulders, hoodoos, ledges and other camps. |
| `wild.js` | Crocodiles, hippos, elephants, monkeys and more. Hippo charges, crocs near swimmers, cold water and hypothermia, quick rescues, people falling in, portages and waterfalls. |
| `pixel.js` | Retro pixel art: the River Rat mascot, the title picture, scene cards, end pictures. |
| `map.js` | The world map on the main menu (Natural Earth 1:110m land, public domain). |
| `map-hd.js` | More detailed coastlines and rivers for the world map when you zoom in. |
| `frogger.js` | Rat Crossing: the Frogger mode. |
| `runs.js` | Runs: the core game. 17 short runs (1 to 2 minutes) of real rapids, from easy to hard, with a countdown, a finish line, 3 stars and unlocks. |
| `market.js` | Daily River (the same short run, boat and water level for everyone each day, with a share grid), river passport, share buttons, and ad hooks that work only on CrazyGames or Poki. |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Install on a phone home screen, play offline, and always load the newest version. |

## How to play

The game opens on the Home screen. Tap **▶ PLAY** to start the next run. There is no long menu before you play.

- **Runs:** 17 short runs on real rivers, from First Splash (Gray Canyon) to Lava Falls (Grand Canyon). Finish a run to unlock the next one.
  - ★ Finish the run.
  - ★★ Finish with no swims and the hull at 50% or more.
  - ★★★ Also run every rapid clean.
- **Daily River:** one short run for everyone each day. Share your result grid.
- **Rat Crossing:** the Frogger mode.
- **Free Run:** the full rivers, Overnight and Expedition modes, the world map and all settings.

## Art style

The game uses one style: smooth painted water and scenery, and the Fredoka font for titles and buttons. The retro pixel look is an option in Settings (off by default).

## Controls

There are two control styles. Pick one on the main menu or in the pause screen.

- **Arcade (default):** Steer left and right. The boat stays pointed downstream. Hold up to row forward, down to slow. Drag or click on the water to steer to that point. Boost (E, Shift or the Boost button) gives a short burst and lowers the risk in holes and waves. Steering assist slides the boat around rocks just ahead. Landings pull you in when you are near.
- **Pro:** Real oars. Left and right oars push or pull. Pulling is stronger than pushing. In 3D, you paddle each stroke.

In Arcade, a hull hit has a maximum damage, and quick repeat hits do less damage. The hull slowly repairs to 60% in calm water.

## Fun features

Stars and streaks for each rapid, near-miss bonus, dry bags and gold to collect, River Bucks for upgrades (Shop), daily missions, badges, a ghost of your best run, and a trip progress bar.

## Publish on GitHub Pages

1. Upload all the files to the root of the repository.
2. Go to **Settings → Pages**.
3. Set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. Wait about one minute. Open the link that GitHub shows.

3D mode loads three.js from cdnjs. Without internet, the game stays in 2D.

## Test on your computer

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Edit the expedition supplies

Open `trip.js` and find `const SUPPLIES=[`. Each line is one item:

- `id`: a short name. Do not change the ids that the game uses: `food`, `water`, `filter`, `firstaid`, `repair`, `spareoar`, `rope`, `warm`, `sunscreen`, `groover`, `fuel`.
- `name`, `price`, `unit`, `desc`: what the player sees.
- `rec`: the recommended amount for `n` people and `d` days.

You can add new items. To give a new item an effect, add code in `TRIP.night` (camp results) or `TRIP.onFlip` (gear lost in a flip).

## Make the leaderboards global (optional)

Now scores save on each device. To share scores with all players:

1. Make a free project at supabase.com.
2. In the SQL editor, run:

```sql
create table runs (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text, river text, craft text, mode text, level text,
  score int, time_s int, ok boolean, swims int
);
alter table runs enable row level security;
create policy "read all" on runs for select using (true);
create policy "add runs" on runs for insert with check (true);
```

3. In **Project Settings → API**, copy the Project URL and the `anon` public key.
4. Open `game.js`. At the top, set:

```js
const LEADERBOARD_REMOTE={enabled:true,url:'https://YOUR-PROJECT.supabase.co',key:'YOUR-ANON-KEY',table:'runs'};
```

The anon key is public by design. Anyone can read it in the page source. The policies above only let people read and add runs.

## Add or change a river

Each river in `rivers.js` has:

- `rapids`: name `n`, mile `m`, class `c`, scout text `beta`. Optional: `line` (the safe line, -1 = left bank, 1 = right bank), `haz` (named holes, rocks, waves, boils), `fan` (side of the debris fan).
- `pois`: history markers. A marker with `page` opens a full page and pauses the game. Other markers show a short card.
- `camps`, `bridges`, `towns`, `crowds`.

Facts are short summaries for a game. Some miles are approximate.

## Grand Canyon data

`rivers.js` has one shared Grand Canyon list (`GC_RAPIDS`, `GC_POIS`, `GC_CAMPS`, `GC_ZONES`) from Lees Ferry to Diamond Creek. The sections and the full expedition are cut from it with `gcSection()`. Change a rapid once and every section gets the change.

## Updating the game

When you change a file, raise the version number `1.8.0` in `index.html` (the `?v=` on each script) and in `sw.js`. Then every phone and computer loads the new files at once.

## Rat Crossing (Frogger mode)

Tap **🐸 Rat Crossing** on the Home screen. Hop your boat downstream one lane at a time. Logs, animals and boats float across the river. White arrows mark fast current that pushes you sideways. Park in the 5 eddies at the take-out to clear a level. Each level is a new river (Green, Grand Canyon, Zambezi, Pacuare, Ganges, Franklin, ice river) and a little faster.

Scoring: +10 each new lane · +50 per park plus 10 per second left · combo ×1.5 to ×3 for parks in a row · +200 swimmer rescue · +200 golden trout · +50 dry bag · +10 flower garland · +5 close call · +1000 × level for a level clear · extra boat every 10,000.

## Expedition vitals

In Expedition mode a bar shows six vitals: 🚽 Groover, 🩹 First Aid, 🛶 Paddles, 🛟 Raft, 🍲 Food and 💧 Water. Buy them at the outfitter. A groover can holds about 8 person-days. At camp, a retro status card shows the date, weather, water temperature, health, food, next rapid and miles.

## Cold water

Each river has a water temperature (`waterF`). A swimmer gets colder every second. In very cold water (Onyx, Soča, Grand Canyon) hypothermia comes fast. A rescue in under 5 seconds is a Quick Rescue bonus.

## Real river bends

`rivers.js` starts with `RIVER_PATHS`. It holds the real bends of each river (not Gauley), made from the Natural Earth 1:10m river centerlines (public domain). Bends smaller than about 2 miles are not in that data. The game puts a limit on how steep a bend can be, so the river stays playable.

## Scenery

`scenery.js` has `SCN_LAND` (what grows or stands along each river, by mile) and `SCN_JUMPS` (cliff-jumping bluffs). Add `slow:900` to a stretch to give it more length on screen.

## Take-outs and stops

Each river has a `takeout` with `miss` text that shows when a player floats past. Markers with `stop` (`hike`, `swim`, `lunch`, `view`) are optional landings. `scene` picks the painted scene type (for example `cavern`, `spring`, `ruin`, `granary`, `turquoise`, `takeout`).
