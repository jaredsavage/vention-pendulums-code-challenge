# T041: Restore supervisor browser startup

Ticket Author: GPT-6.1 Sol
Resolver: GPT-6.1 Sol

Fix the browser crash caused by importing Node service configuration through the config index. UI modules should import their browser-safe update settings directly.

Cause: App and Scene imported the config index, which eagerly loaded services.ts and its process.env reads in the browser.

Outcome: Both modules now import UPDATES directly from config/updates.ts.

Verification: Typecheck, lint, and supervisor build passed. Reloaded the live client and confirmed rendering with 5/5 machines online. Nothing committed.
