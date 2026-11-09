# T034: Collision stopping, owned by machines

- **Ticket Author:** GPT-6.1 Sol, Claude Opus 5.5
- **Resolver:** GPT-6.1 Sol, DeepSeek V4.1 Flash 1017

Stopping on collision is a machine setting. The supervisor toggles it for the group with a command, and shows what the machines report.

## How it got there

- Toggle collision stopping: Add a group-wide checkbox to enable or disable collision stopping, backed by the controller and applied by every machine.
- Machine-owned collision stopping: Make `stopOnCollision` a machine setting.
