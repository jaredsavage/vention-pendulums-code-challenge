# T072: The supervisor dock and machine panes

- **Ticket Author:** GPT-6.1 Sol, Claude Opus 5.5, DeepSeek V4.1 Flash 1017, GPT-6
- **Resolver:** GPT-6.1 Sol, DeepSeek V4.1 Flash 1017, Claude Opus 5.5, GPT-6

The supervisor client is a Dockview layout: the dashboard in a tab that stays open, and one reusable pane showing the selected machine's own page, which stays open under an Offline overlay when its machine goes away.

## How it got there

- Side-by-side manager windows: Two explicit WinBox components share the existing monochrome styling.
- Open machine configuration windows: Rows and machine-name links open a centered, matching configuration window with the machine name and URL.
- Machine address links: Added a focused MachineAddress component to the supervisor table, with matching WinBox styling and name/URL titles.
- Supervisor client hosts the dock: Supervisor client owns React scene/table panels and machine iframe panels; duplicate machine selection activates the existing panel.
- Supervisor window: Added react-winbox with matching WinBox styles, lower-half initial placement, monochrome overrides, and the service URL in the title.
- Replace WinBox with Dockview: Replace the simulator's WinBox window layout with Dockview: manager controls on the left, the embedded supervisor client on the right, and machine settings in a Dockview floating panel.
- Explain empty supervisor panels: Show meaningful empty states when the supervisor has no machines, instead of blank dock panels.
- Restore the supervisor page inside one dock pane: Dockview fills the viewport, with the complete dashboard in one Supervisor pane and individual machine pages alongside.
- Reuse the machine settings pane: Scene, row, and ordinary address selections reuse one machine pane, updating its page and title or creating it if closed.
- Close a departed machine's pane: `SupervisorDock` has `closeMachinePanelIfGone`, next to `openMachinePanel`.
- Supervisor address in embedded tab: The supervisor uses its own current page URL in the dock tab only when window.self differs from window.top.
- Keep the supervisor tab open: The supervisor tab uses Dockview’s default tab with its close action hidden.
- Keep offline machine panes open: Kept the machine pane open, dimmed its last page while offline, and restored it when the event stream reconnects.
