# Home Hunt

GitHub Pages home-search catalogue with private, device-synchronized household likes and explained recommendations.

September 6, 2026 refresh: 500 active discovery candidates (151 condos, 269 houses, 80 attached homes), selected from 3,569 distinct source properties. All original 45 IDs remain; 533 records total. Source-reported availability is a snapshot, not a guarantee. No candidate is certified lease-free. Schools, commute, condition and incomplete costs need verification.

See [sources and methodology](methodology.html) and [refresh audit](data/refresh-summary.json) for scope, selection bias, indicator definitions and limitations. Crime context is not a safety score. NYC local counts and Nassau county totals are not comparable. Bike proximity is not a safe-route assessment. Nassau bike-derived data: © OpenStreetMap contributors, ODbL 1.0; independent MLS/government data retains its own terms.

## Development

`index.html` embeds the catalogue; `server/homes.json` must match it exactly. `sync-app.mjs` renders filters, cards and feedback; `catalog-view.mjs` provides testable selection logic; `taste-engine.mjs` is shared by browser and server. `scripts/geo.mjs` contains indicator distance/count calculations. Shared data lives in the private DynamoDB service, never in the public repository.

Use Node 22 or newer. Run `npm ci` then `npm test` in `server/`. From the repository root, `PREVIEW_PORT=8875 node server/test/preview.mjs` starts a disposable in-memory preview. The test-only connection code is in that preview script; never use a real household token in tests.

Before a future refresh, follow [AGENTS.md](AGENTS.md): read the private shared profile, verify source listings, preserve stable IDs and unknown values, mirror the catalogue, test, deploy the server catalogue before the public frontend, and verify GitHub Pages. Never publish likes, notes, private links or source HTML dumps. An unverified old listing stays available for saved likes but is excluded from fresh recommendations. Operational deployment and backup instructions are in [server/README.md](server/README.md).
