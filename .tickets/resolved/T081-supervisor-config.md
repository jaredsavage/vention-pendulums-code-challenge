# T081: Combine supervisor configuration

- **Ticket Author:** GPT-6
- **Resolver:** GPT-6

Combine the supervisor configuration into one config.ts with named exports and a default CONFIG export.

Outcome: Consolidated supervisor settings in config.ts, updated imports and documentation, and kept the render settings safe to import in the browser.

Verification: npm run check and npm run format:check passed; checked browser-safe imports and environment overrides.
