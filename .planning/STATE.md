# Home Hunt state

September 7 delivered: user explicitly chose to keep public listings on GitHub Pages. Richer cards, 500 source-linked photo previews, explicit per-member dislikes/reasons, and remembered server-verified password login are live in implementation commit `476d10c`. Existing shared feedback was backed up and preserved; the DynamoDB container was unchanged. All 17 automated tests pass. Live page assets exactly match the release, and HTTPS login/session reuse/unauthenticated denial were verified without writing real feedback. See `phases/02-easier-feedback/02-02-SUMMARY.md`. Password and hash remain server-only. Do not move hosting or make the public catalogue private without a new user request.

Updated September 6, 2026. The catalogue contains 500 source-reported active discovery candidates and 33 retained originals outside that set. Preserve all stable IDs and private feedback on future refreshes. Read the shared profile privately before tailoring a search.

Current delivery: listing refresh, crime context, bicycle-infrastructure proximity, search/comparison controls and feedback tags. Implementation: `5ea32c2`. See `phases/01-refresh/01-01-SUMMARY.md` for verification and `../methodology.html` for data limits.

Do not present this list as 500 fully qualified homes: lease-free status is unverified for every candidate; school quality and travel times are not freshly verified. Keep unknowns explicit. No demographic proxies or crime-based safety rankings. No household credentials, likes, notes or incident-point dumps in GitHub.
