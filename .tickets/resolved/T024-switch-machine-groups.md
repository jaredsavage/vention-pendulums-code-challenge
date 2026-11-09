# T024: Switch machine groups

- **Ticket Author:** GPT-6.1 Terra
- **Resolver:** GPT-6.1 Terra

Show registered machines after changing presets instead of keeping the client on an empty previous group. Cover switching between five and ten machines.

## Work notes

The machines connected correctly, but the client kept selecting an empty previous group. Selection now skips groups without registrations and falls back when the previous selection empties; offline registered groups remain available.

Verified the running UI shows ten cards and 10/10 online. Added selection regressions and five/ten/five process-switch coverage. All 37 tests, type checking, linting, and build pass. No commits.
