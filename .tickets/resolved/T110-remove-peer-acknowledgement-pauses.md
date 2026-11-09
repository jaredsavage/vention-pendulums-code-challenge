# Remove peer acknowledgement pauses

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Remove the automatic pause caused by a missing peer acknowledgement, along with the unused acknowledgement machinery. Keep disconnection and stale neighbour handling.

Removed peer acknowledgement callbacks, timeout handling and the pause hook. Controls use ordinary Socket.IO sends; position updates remain volatile. Updated Messages. Disconnection and stale neighbour handling remain.

Verification: readability review and npm run check passed (30 tests). Changed files pass formatting; full format:check flags an unrelated issue in reports/README.md. Nothing committed.
