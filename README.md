# River Run

A whitewater game for computer and phone. Run real stretches of real rivers in a raft, kayak, dory or inner tube.

## Files

Put all of these files in the root of your GitHub repository (6 code files plus this README):

| File | What it does |
|---|---|
| `index.html` | The page, the screens and the styles. |
| `rivers.js` | River data: rapids, camps, history markers, bridges, towns, crowds and boats. |
| `game.js` | The core game: physics, 2D view, controls, leaderboards, history pages. |
| `trip.js` | Overnight and Expedition modes: camps, crew, supplies, boats in your trip, events, camp scene, save and continue. |
| `scenes.js` | Animated painted scenes for history pages, stops, take-outs and dangers. |
| `three-d.js` | The 3D view near big rapids, landmarks and bridges. |

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

## Take-outs and stops

Each river has a `takeout` with `miss` text that shows when a player floats past. Markers with `stop` (`hike`, `swim`, `lunch`, `view`) are optional landings. `scene` picks the painted scene type (for example `cavern`, `spring`, `ruin`, `granary`, `turquoise`, `takeout`).
