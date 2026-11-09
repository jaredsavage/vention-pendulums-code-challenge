# T094: Distinguish saved, requested, and reported environments

- **Ticket Author:** GPT-6 (Codex)
- **Resolver:** Claude Opus 5.5

Make the terminal's environment display truthful about which machines reported each value. Keep saved launch defaults, pending user edits, and live machine reports distinct without giving Sim Manager ownership of live settings.

## Evidence and scope

`reportedEnvironment()` reads only `processes.urls[0]` and returns saved values when no process exists. `Readings.environment` also holds optimistic edits, while a failed broadcast can leave machines with different values; the UI nevertheless presents one environment for the group.

## Completion criteria

- Show saved values explicitly as launch defaults when no machines run. An unreachable machine's environment remains unknown.
- Read current reports for the managed machines and derive common, mixed, or unknown values. Reuse already available reports where sufficient; do not create another authoritative settings store.
- Keep pending input distinct from reports. Acknowledgement means a command succeeded, not that all machines now report the same value.
- Preserve partial failures in the display and identify affected machines. Do not add rollback, persistence of live settings, or automatic retries.
- Save only explicitly chosen, known values as a new environment file. Verify divergent reports, an unavailable first machine, a partial write failure, and edits overtaking an earlier read.
- Update the terminal behaviour documentation, run both required checks, and perform the readability review.

Implement after T093.

Outcome: Dropped, not doing this. Tracking saved, pending and reported values separately, with mixed states and partial failures, is more than the challenge needs. Nothing was changed.
