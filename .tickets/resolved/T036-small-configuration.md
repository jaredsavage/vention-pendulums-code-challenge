# T036: Small configuration, read once per app

- **Ticket Author:** GPT-6.1 Sol, GPT-6.1 Terra, Claude Opus 5.5
- **Resolver:** GPT-6.1 Sol, GPT-6.1 Terra, DeepSeek V4.1 Flash 1017

Config holds only addresses, ports, rates and the collision gap. Each app reads its environment overrides once, in its own config module, and everything else imports `CONFIG`.

## How it got there

- Centralize configuration: Centralize operational settings such as timing, network limits, and storage paths in a commented config file.
- Split configuration: Split operational configuration into section files with direct exports and a `CONFIG` index.
- Configuration reference: Root all-config.ts lists application defaults, terminal addresses/timings, and domain/environment bounds in one flat object, with per-value descriptions.
- Remove configuration reference comments: Removed comments from all-config.ts, leaving its flat list of descriptive names and values.
- Simplify application configuration: Removed network, startup, and management config files.
- Derive URLs and discover default files: Removed supervisor URL entries from config/reference.
- One supervisor address: Every app should get the supervisor's address from one place, with one environment override.
- Read configuration once per app: Each app should apply its environment overrides once, in its `config/` folder, and everything else should import the result.
- One machine address: A machine's address should be worked out once, in simulator setup, and passed along from there.
- One preset and environment lookup: Finding, naming, and defaulting preset and environment files should live in one module.
