# Run the integration test as separate programs

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Launch the supervisor and simulated machines in separate processes. Exercise collision recovery through the public network API, including a real restart, and update the testing guide.

The network test now spawns the normal supervisor and machine entry points as four independent Node processes. Commands and observations go through HTTP, and it waits for the real five-second recovery and shared next run. All test processes are terminated and awaited in cleanup. Updated testing.md.

Verification: npm run check passed (17 tests). format:check flags only existing AGENTS.md formatting. No application behaviour changed; no commit.
