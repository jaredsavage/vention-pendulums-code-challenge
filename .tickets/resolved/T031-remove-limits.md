# T031: Remove domain limits

Ticket Author: GPT-6.1 Sol
Resolver: GPT-6.1 Sol

Remove numeric ranges, string-length restrictions, group-size caps, and their configuration reference entries. Keep structural schemas and remove stale limits guidance.

Outcome: Deleted limits and range/string/member-count constraints in schemas and registration. Removed reference entries and updated guidance. Structural validation remains. Fixed a preset-loading test that assumed a fixed Montreal gravity instead of using the editable preset.

Verification: Typecheck, lint, all 46 tests, and both builds passed. Nothing committed.
