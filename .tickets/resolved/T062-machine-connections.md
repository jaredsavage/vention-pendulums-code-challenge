# T062: The machine connections table

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

The machine page lists its supervisor and peers, with a connection dot, received update rate, surface distance, and whether each is a neighbour.

## How it got there

- Machine connections table: Added the Connections table with connected peers, Neighbour/Peer relationships, addresses, and the supervisor’s connection status.
- Connection measurements: Connections columns now read Name, Address, Status, Update frequency, Distance, Relationship.
- Surface distance in machine connections: The machine subtracts its own radius and the peer’s reported radius from centre distance, clamping surface gaps to zero at contact/overlap.
- Shorter connection update heading: Renamed the column to Updates; values retain their Hz units.
- Connection status dots: Replaced Status text/column with accessible labelled dots beside addresses: green connected, grey disconnected.
