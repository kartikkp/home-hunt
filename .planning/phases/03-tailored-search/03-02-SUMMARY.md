# Both sort directions

September 8, 2026. Implementation: `5cf3f07`.

Added ascending and descending options for price, estimated monthly payment, living area, known HOA + tax, rail distance and mapped bike distance. The existing menu groups 12 choices by metric. Each direction works with category, liked and other existing filters. Sorting keeps unknown/incomplete/non-finite values last regardless of direction, retains valid zero values, breaks ties by stable home ID, and does not mutate the input catalogue. Calculated values are computed once per home per sort.

Verification: all 29 automated tests pass, including four new tests for the 12 options, legacy direction defaults, stable ties, category/liked filtering, financing changes and missing values. JavaScript syntax passes; disposable local preview returns HTTP 200. No interactive browser QA requested or performed. Catalogue parity and existing feedback/API regressions pass. No backend deployment, credential or database changes needed. Frontend module versions updated for cache consistency; publication remains GitHub Pages on main.
