# T004: Discovery and persistence

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

## Description

Implement group discovery and SQLite persistence for membership and saved configuration, following [architecture.md](../../docs/architecture.md).

## Done when

Group definitions and membership versions survive a service restart; live registrations are re-established.

## Work notes

Implemented controller registration, in-memory group state, API validation, and SQLite configuration persistence. Reopen and membership-version tests pass.
