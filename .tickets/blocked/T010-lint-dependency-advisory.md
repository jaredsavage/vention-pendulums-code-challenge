# T010: Update lint dependency when a compatible fix is available

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** Unassigned

Update the lint toolchain to remove the minimatch glob-amplification advisory without forcing an incompatible major override. See [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Work notes

npm audit reports moderate findings in development lint dependencies. Do not use the suggested downgrade to ESLint 4; rerun the audit when upstream dependencies update.

November 3, 2026: reran the audit. ESLint 10.14.0 and `@eslint/config-array` 0.23.5 still depend on minimatch 10.x, and minimatch 11 is not yet accepted by those packages. No compatible update is available.
