# T032: Allow all origins

Ticket Author: GPT-6.1 Sol
Resolver: GPT-6.1 Sol

Remove allowed-origin configuration and allow all browser origins for HTTP and supervisor Socket.IO access.

Outcome: HTTP CORS now uses its allow-all default; supervisor Socket.IO allows *. Removed both settings and reference entries.

Verification: Typecheck and lint passed. A temporary supervisor returned Access-Control-Allow-Origin: * for an arbitrary Origin header and was closed afterward. Nothing committed.
