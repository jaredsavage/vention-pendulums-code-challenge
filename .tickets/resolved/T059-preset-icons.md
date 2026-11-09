# T059: Preset icons

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

A preset can have a folder of icons next to its JSON file, named after its members (for example `solar-system/earth.svg`). The simulation manager serves them, each machine reports its icon's URL as an optional machine property, and the scene and machine preview draw the icon in place of the plain bob.

## Completion criteria

- `icon` is an optional URL in the machine properties in `protocol`; nothing is sent per frame beyond that URL.
- Members without a matching file keep the plain bob.
- The solar-system preset has a full-colour icon for each planet, drawn for this project.

Outcome: `icon` is an optional URL in the protocol's machine properties. When loading a preset, the manager gives a member an icon URL if `<preset>/<member name>.svg` exists next to the preset file, and serves the preset folders under `/presets/`. In `@repo/ui`, `loadedIcon` loads each icon once, and `drawPendulum` draws it at twice the bob's diameter, with the planet filling the middle half so the disc matches the collision radius. Without a loaded icon it draws the plain bob. The supervisor scene and the machine preview pass the icon through. Eight full-colour planet SVGs, drawn for this project, sit in `data/configurations/solar-system/`. `development.md`, `message-types.md` and `testing.md` describe them.

Verification: `npm run check` passed (59 tests), including a preset test for icon URLs and a management test that the manager serves an icon as SVG. `format:check` reports only `meta/Musings.md`. Browser: the solar-system preset drew every planet in colour in the scene, and Saturn's machine page drew it in the preview. Nothing committed.
