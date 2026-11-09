# T082: Shared scene component

- **Ticket Author:** Jared
- **Resolver:** Claude Opus 5.5

The supervisor and the machine page both draw pendulums, but each one does its own canvas plumbing. I'd like one `Scene` component in `packages/ui` that both use, so callers pass in data and get events back, and nothing outside it knows how it draws.

The name stays generic, even if pendulums are all it shows for now. Nothing in its name or props should say "canvas". That's an internal detail.

It owns everything about drawing: sizing for the screen's pixel density, fitting the view, the grid, the frame loop, smoothing between updates, pendulums, neighbour links, the selection ring, click selection, and the frame rate.

```tsx
<Scene
  pendulums={pendulums}
  links={neighbourPairs}
  onSelect={selectMachine}
  showFrameRate
>
  Supervisor updates {updateHz} Hz
</Scene>
```

It should be less code than what it replaces, without losing anything. Keep it minimal and easy to read, with pretty whitespace and an order that reads naturally.

Done when the supervisor's `Scene.tsx` and `drawScene.ts` are gone, and `MachinePreview` is just the component plus its readout.

## Outcome

`Scene` lives in `packages/ui/components`, with its drawing in `utils/drawScene.ts`. The supervisor maps its snapshot in `sceneContents.ts` and counts its own update rate in `useMachines`. `MachinePreview` is the component plus its readout. The old `Scene.tsx`, `drawScene.ts` and `setCanvasGrid` are gone.

Changes along the way: a `label` prop for the accessible name, no render-rate cap (`CLIENT_RENDER_HZ` removed), smoothing by arrival time instead of run and sequence tracking, rates as whole counts per second, and 0.5 m of padding on every side instead of pixel margins.

## Verification

`npm run check` (65 tests) and `format:check` pass. In the browser, the scene drew and followed the running group, links and click selection worked, and the machine preview showed its readout. Nothing committed.
