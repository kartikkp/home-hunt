# Home Hunt

GitHub Pages home-search catalogue with private, device-synchronized household likes and explained recommendations.

Latest September 9 refresh: 1,306 distinct properties screened across 50 ZIP pages; 640 detail pages parsed from 641 attempts. Added 14 homes and rechecked 509 existing records, including one original matched without duplicating its ID. All previous 541 IDs survive: 555 total records, 506 source-reported active candidates. The latest-search view contains 15 options (14 new, one reverified original). Recorded 31 asking-price drops and 19 status changes. Thirty-two records remain not reverified and are retained for saved feedback, not fresh recommendations. See [search audit](data/search-2026-09-09.json).

Crime and bicycle indicators retain their explicitly dated source snapshots, not a new safety assessment. Four newly added Nassau houses have unknown bike proximity. Land-lease status and most rental rules remain unverified; missing condo fees remain unknown. Every latest-shortlist primary photo returned an image when checked September 9.

Every card now calculates fixed-rate mortgage principal + interest + monthly property tax + HOA. Editable assumptions default to 20% down, 6.71% interest (Freddie Mac September 3 benchmark) and 30 years, saved on the device. Unknown costs and suspiciously high source tax amounts produce incomplete subtotals, not fake zeroes. Insurance, PMI, maintenance, utilities, closing costs and special assessments are excluded; a known assessment is separately shown. Source-reported lighting/interior facts can support explicit preferences, while size drawbacks are compared within the same property type. No visual or safety attributes are inferred from price, size or location.

September 7: public listing cards now include source-linked photo previews, richer structured details, and explicit per-member dislikes with multiple reasons. Sign in with the shared password once per device (remembered for 180 days), then choose Kartik or Minoli. The password is verified by the server; neither password nor hash belongs in GitHub. Listing data remains public. Existing connected devices continue working without re-pairing.

September 6, 2026 refresh: 500 active discovery candidates (151 condos, 269 houses, 80 attached homes), selected from 3,569 distinct source properties. All original 45 IDs remain; 533 records total. Source-reported availability is a snapshot, not a guarantee. No candidate is certified lease-free. Schools, commute, condition and incomplete costs need verification.

See [sources and methodology](methodology.html) and [refresh audit](data/refresh-summary.json) for scope, selection bias, indicator definitions and limitations. Crime context is not a safety score. NYC local counts and Nassau county totals are not comparable. Bike proximity is not a safe-route assessment. Nassau bike-derived data: © OpenStreetMap contributors, ODbL 1.0; independent MLS/government data retains its own terms.

## Development

`index.html` embeds the catalogue; `server/homes.json` must match it exactly. `sync-app.mjs` renders filters, cards and feedback; `catalog-view.mjs` provides testable selection logic; `taste-engine.mjs` is shared by browser and server. `scripts/geo.mjs` contains indicator distance/count calculations. Shared data lives in the private DynamoDB service, never in the public repository.

Use Node 22 or newer. Run `npm ci` then `npm test` in `server/`. From the repository root, `PREVIEW_PORT=8875 node server/test/preview.mjs` starts a disposable in-memory preview. Its password is `preview-password-only`, not the production password. Never use real household credentials in tests.

Before a future refresh, follow [AGENTS.md](AGENTS.md): read the private shared profile, verify source listings, preserve stable IDs and unknown values, mirror the catalogue, test, deploy the server catalogue before the public frontend, and verify GitHub Pages. Never publish likes, notes, private links or source HTML dumps. An unverified old listing stays available for saved likes but is excluded from fresh recommendations. Operational deployment and backup instructions are in [server/README.md](server/README.md).
