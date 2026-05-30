# Word Practice — content pack

## Files

| File | Description |
|------|-------------|
| `wordpack.json` | Full pack: 4 modules, **91 words**, **364** fill-in-the-blank sentences (4 per word) |
| `../scripts/build_wordpack.py` | Source generator; run to rebuild after edits |

## Regenerate

```bash
py scripts/build_wordpack.py
```

## JSON shape (per word)

- `word` — display label (e.g. `fawn over`, `carbon footprint`, `storm-proof`)
- `explanation` — English, ages 10–12
- `pictureSearch` — keywords for cartoon/photo lookup
- `pictureStyle` — `cartoon` | `diagram` | `photo`
- `sentences[]` — each has `text` (with `___`), `answer`, `distractors` (3, same module)

## Modules

1. **Nature & living things** (13 words) — affect, earthworm, effect, emergent, ferocious, grasshopper, insect, mammal, poisonous, sustain, trek, underground, understory  
2. **Climate & environment** (15 words) — carbon footprint, climate change, damage, dangerous, destructive, drought, frequent, greenhouse gas, gust, marine, prone, rescue, resource, storm-proof, survivor  
3. **Story, creatures & mood** (27 words) — includes **fawn over** (not baby deer), **muster** (gather courage), cartoon-friendly spooky words  
4. **Science & matter** (36 words) — investigation, matter & changes, materials & electricity, plus composition, substance, dough, grind, phenomena, split, resistance, barrel, alley, coarse, and related terms  

## Locked choices

- **understory** — rainforest middle layer  
- **fawn over** — flatter/praise excessively (full phrase on card)  
- **muster** — gather courage  
- **Pictures** — cartoon for mood/scary/fantasy words; diagrams/photos where noted  

## Play the game

1. Open PowerShell in the project folder: `d:\Game\WordPractice`
2. Run: `py -m http.server 8080`
3. In **Chrome, Edge, or Firefox**, open: **http://localhost:8080**

Do not double-click `index.html` — the browser needs the local server to load `wordpack.json`.
