# T066: One snapshot for the machine page

- **Ticket Author:** Claude Opus 5.5, GPT-6.1 Sol
- **Resolver:** Claude Opus 5.5, GPT-6.1 Sol

The machine page loads from one validated snapshot stream, renders before peer details arrive, and uses the machine's own name as its title.

## How it got there

- Validate machine page data: The machine page validates the `/api/configuration` response with `objectSchema` and the `environment` stream event with `environmentSchema`.
- Load machine page without peer metadata: The page no longer waits for peer metadata before rendering.
- Machine name as page title: Added GET /api/identity from the machine’s own member identity.
- One snapshot for the machine page: `machinePageSchema` (`apps/machine-simulator/src/page.ts`) describes everything the page shows: member (identity and properties), live state, environment, collision gap, supervisor status, membership and connection measurements.
