# T017: Machine property discovery

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Connected machines and the supervisor ask each machine for its properties, documented first as an architecture note and then implemented.

## How it got there

- Machine property discovery note: Document that connected nodes request machine properties instead of reading simulation definitions.
- Machine property discovery: Implement requested machine properties as described in [the architecture note](../../docs/arch-notes/machine-properties.md), without exposing simulation definitions to connected nodes.
