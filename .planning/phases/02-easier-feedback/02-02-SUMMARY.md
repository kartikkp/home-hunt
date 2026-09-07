# Delivered September 7 — GitHub Pages retained

User resolved the hosting choice: listings are public information and the app stays on GitHub Pages. Implementation commit `476d10c` includes the previously prepared photo/detail/dislike work (`e35f3a5`).

Replaced connection-code and pairing-link controls with a shared-password sign-in and a Kartik/Minoli picker. The server checks a salted scrypt hash and returns a signed 180-day bearer session. Only the session is remembered in browser storage. Existing household-token sessions remain compatible. Sign-out clears local session/cache after pending changes finish; a new login is required after expiry, browser-storage clearing or password-hash rotation. This protects shared feedback, not publicly hosted listing data.

Login requests have strict size/type checks, per-IP failed-attempt limits, a global rate budget and bounded password-hashing concurrency. No password/hash or returned session was committed or printed during production verification. CORS still permits only the GitHub Pages origin. No gateway, hosting destination or database replacement was needed.

Published source-linked photos for 500 homes, up to six previews each; nearly 10,000 structured detail fields across 501 source snapshots; explicit, reversible per-person dislikes with multiple reasons and notes; negative-feedback exports and 'what to avoid' summaries. All original IDs and the 533-record catalogue remain, including 500 active candidates from the previous snapshot. The September 7 photo/details update is not a new availability refresh.

Verification: 17 automated tests passed, covering previous sync/catalogue behavior plus photos, escaping, negative feedback, password sessions, tamper/expiry rejection and rate limits. Live HTTPS health, password login, CORS, repeated authenticated state reads and unauthenticated 401 were checked with zero feedback writes. Existing private feedback was backed up on serverwheel and verified preserved. Production catalogue/server/auth/engine hashes match the tested files. GitHub Pages reported implementation commit `476d10c` built successfully. Every public HTML/JS/CSS/methodology asset matched local source exactly; the published HTML contains the password form and dislike filter, 533 records and 500 photo-enabled homes.

No interactive browser test was performed for this password change. This release was verified through automated tests and live HTTP/source checks. The prior phase's browser tests covered the retained filtering, paging, member selection and layout behavior.
