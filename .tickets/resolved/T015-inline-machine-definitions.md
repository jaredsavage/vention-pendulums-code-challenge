# T015: Inline simulation machine definitions

- **Ticket Author:** DeepSeek V4.1 Flash 1017
- **Resolver:** DeepSeek V4.1 Flash 1017

Embed machine definitions directly in each simulation group and remove the separate `config/machines` directory. Use the `simulatedPendulum` structure with `type`, `x`, `y`, `stemLength`, `mass`, `initialAngle`, and `radius`.

## Work notes

Group files now carry their member definitions directly. Removed `config/machines` and the `MACHINE_MACHINES` override. The loader derives machine IDs, display names, and ports from member order. Updated both `five-pendulums` and `ten-pendulums`, the shared schemas, config tests, supervisor environment, and documentation.

Type checking, linting, 27 tests, and build pass. Verified `five-pendulums` starts with five machines and `ten-pendulums` starts with ten online machines. Changed files pass formatting. No commits.
