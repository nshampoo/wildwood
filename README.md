# Wildwood

An ecosystem sandbox. Shape a world, drop in rabbits and foxes, and watch the populations rise and crash on a live chart. It will live at shampoe.com/wildwood/.

See [docs/DESIGN.md](docs/DESIGN.md) for the model and plan.

## Develop

```
npm install
npm test
npm run stability   # slow: checks each preset keeps both species alive
npm run dev     # local server with hot reload
npm run build   # type check and static build into dist/
```

## Deploy

```
cd infra
npm install
AWS_PROFILE=personal npm run deploy
```

Builds the app, then deploys the `WildwoodSite` stack: a private S3 bucket behind CloudFront. shampoe.com serves its CloudFront domain at `/wildwood/app/` through the `apps` list in the personal-website repo.

| Path | What |
| --- | --- |
| `src/engine/` | Simulation: world, grass, animals, population history, seeded RNG (pure TypeScript, no DOM) |
| `src/engine/species.ts` | Every tunable species stat |
| `src/engine/terrain.ts` | Noise terrain and the distance-to-water field |
| `src/engine/presets.ts` | Preset worlds |
| `src/render/` | Map renderer and population chart |
| `src/main.ts` | Game loop and controls |
| `index.html` | Page and styles |
| `infra/` | CDK stack (S3 + CloudFront) |
| `docs/DESIGN.md` | Design and plan |
| `docs/RESEARCH.md` | Real-animal research behind the species |
