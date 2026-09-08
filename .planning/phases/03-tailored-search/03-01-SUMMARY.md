# Targeted search and monthly estimates

Delivered September 7, 2026 (Eastern time). Implementation `03bb405`; cache-version fix `68cf911`.

- Read current feedback privately before researching; no household records, notes, credentials or raw source pages were published.
- Searched 28 public ZIP pages / 663 distinct properties; checked 52 detail pages. Added 8 homes, rechecked 30 existing records, and surfaced a 14-option latest-search view. Every previous 533 ID remains; 541 total, 508 source-reported active.
- Sources preserve per-card listing dates and the original crime/bike observation periods. Photos, condition/light descriptions, tax-abatement caveats, staging disclosures, missing HOA and a reported assessment are attributed to listings. No fresh school/safety/commute ratings or visual similarity claims were invented.
- Added fixed-rate mortgage + tax + HOA estimates to each card. Defaults: 20% down, 6.71% benchmark, 30 years. Assumptions are editable and stored on-device. Unknowns remain incomplete; large tax outliers are flagged; low taxes prompt abatement verification. Insurance/PMI/maintenance/closing costs/assessments are not silently bundled. Known assessment is shown separately with an including-assessment figure.
- Monthly sorting keeps incomplete estimates last. The matching engine uses source-supported interior/light evidence, compares size negatives within property type, and avoids treating tiny straight-line rail distances as hard access exclusions. Explicit dislikes and member isolation remain unchanged.

## Verification

- 25 automated tests pass, including API auth, conflicts, feedback undo/isolation, catalogue parity, all prior IDs, amortization, cash/zero-rate scenarios, missing values, sorting, escaped markup and preference evidence.
- JavaScript syntax passes; all static control IDs resolve in source. Disposable HTTP preview responds 200. No interactive browser QA was requested or performed.
- All 38 refreshed primary photo URLs returned image responses.
- Backend backup: server-only `backups/pre-targeted-2026-09-07.json`; code rollback archive outside app checkout. API and backup rebuilt; DynamoDB container/volume, routing and login secrets unchanged. Existing records verified unchanged at equal versions (or newer versions accepted).
- Production server hashes match the tested catalogue, API, export and taste engine. HTTPS health/login/private profile read pass; unauthenticated feedback reads return 401. Zero production feedback writes during verification.
- GitHub Pages build for `68cf911` succeeded. All nine checked public assets exactly match local source, including the embedded catalogue, calculator, shared recommendation logic and search audit. Versioned browser assets prevent stale modules mixing with updated cards.

## Limits

This was a targeted pass, not a fresh check of every prior listing or an exhaustive MLS feed. Highlights are seller/broker claims, not an inspection. Financial figures are comparison estimates, not financing or tax advice. Future searches must read the latest private profile again and verify listing availability independently. Keep GitHub Pages hosting unless the user requests otherwise.
