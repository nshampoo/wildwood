# Wildwood

An ecosystem sandbox. Shape a world, drop in rabbits and foxes, and watch the populations rise and crash. It will live at shampoe.com/wildwood/.

See [docs/DESIGN.md](docs/DESIGN.md) for the model and plan.

## Develop

```
npm install
npm test
npm run dev     # local server with hot reload
npm run build   # type check and static build into dist/
```

## Deploy

Not set up yet.

| Path | What |
| --- | --- |
| `src/engine/` | Simulation: world, grass, animals, seeded RNG (pure TypeScript, no DOM) |
| `src/render/` | Canvas renderer |
| `src/main.ts` | Game loop and controls |
| `index.html` | Page and styles |
| `docs/DESIGN.md` | Design and plan |
