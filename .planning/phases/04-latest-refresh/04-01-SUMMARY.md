# September 9 listing refresh

Implementation: `3ff680e`. Public catalogue remains on GitHub Pages; the existing server continues private device sync. No authentication, password, database schema, feedback or taste-engine changes.

## Delivery

- Screened 1,306 distinct public properties across 50 ZIP first-result pages; parsed 640 detail pages from 641 attempts.
- Added 14 reviewed homes (ten Queens condos, four Nassau houses), rechecked 509 existing records, and retained all previous 541 IDs and original 45. One Woodside original was matched to its current listing without a duplicate.
- Total 555; 506 source-reported active/eligible. Latest-search view contains 15 homes: 14 new and one reverified original. Recorded 31 asking-price drops and 19 status changes.
- Retained 32 not-reverified records for saved feedback, excluded from fresh recommendations. One source failed identity verification.
- Preserved monthly estimates, all categories and filters, both directions for all six sorts, photos, shared likes/dislikes, reason tags and recommendations. Public-source highlights retain their research date separately from listing refresh dates.
- Kept unknown condo fees and legal questions explicit. No home is certified land-lease-free. Rental rules require building documents; 220 Manhattan Avenue has a building-level waiting-period/approval caution, not a verified current unit rule.
- Crime/bicycle snapshots retain their prior dates. Four new Nassau houses have unknown bike proximity. No new safety or school ratings were invented.

## Verification and operations

- All 30 automated tests pass, including catalogue equality, every prior stable ID, auth/session/conflict handling, payment math, both sort directions, failed-identity exclusion and legal caveats.
- All 15 latest-shortlist primary photo URLs returned HTTP 200 images. 520 total records have source-linked photos.
- Server catalogue backed up and replaced before frontend publication; deployed SHA256 matches local `server/homes.json`: `e8c844276b7bfb60088fac5e4cf91f9bcfbab2543e5aadd4d65f5344cfad2b91`.
- Private feedback backed up on server and compared after deployment: existing records unchanged (newer user edits permitted). Persistent DynamoDB container/volume and server-only login configuration untouched. HTTPS health succeeds; unauthenticated state returns 401.
- GitHub Pages implementation run `34417918604` succeeded. Live `index.html`, `sync-app.mjs`, `card-details.mjs` and `methodology.html` returned HTTP 200 and exactly matched the tested release. Public URL: https://kartikkp.github.io/home-hunt/?v=20260909-refresh.

Research profile, cached source HTML, selections and deployment archives remain outside the public repository. The public audit contains source URLs, timestamps, listing changes and selection limitations only. No raw listing remarks or private feedback published.
