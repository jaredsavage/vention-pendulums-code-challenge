# T092: Separate property drafts from reported machine state

- **Ticket Author:** GPT-6 (Codex)
- **Resolver:** Claude Opus 5.5

Keep the live scene based on one machine report and the form based on explicitly unsaved edits. Give form saves and dragging one understandable write path so dragging cannot silently submit unrelated form edits.

## Evidence and scope

`PropertiesEditor.tsx` initializes its draft only once and passes draft geometry with the reported position to `MachinePreview`. `useDragMachine.ts` posts the entire draft on every drag, including unrelated unsaved fields, and its request queue discards error results.

## Completion criteria

- Render live geometry and position from the same reported state. Retain the form's Save interaction; unsaved form values do not change the live scene.
- Refresh untouched form values from reports without overwriting active edits. Clear successful edits through an explicit save/report reconciliation rule.
- Drag requests change only the intended properties. Prefer a shape-validated property patch, merged by the machine, if it avoids full-object stale writes; define any shared request schema once in protocol.
- Keep hold, property updates, and release ordered, coalesce only superseded property updates, and show failures. Preserve release on pointer cancellation and address component disposal while held without adding a retry system.
- Verify an external property update, an unsaved mass edit followed by a drag, a failed write, and a normal drag/release. Update property-edit documentation alongside any API change.
- Run both required checks and perform the readability review.

Implement after T091 so machine-side edits build on the settled device boundary.

## Outcome

The preview always shows what the machine reports. The form holds only the fields being edited and shows reports for the rest, and a successful save clears the edits. Drags and saves send a property patch that the machine merges, defined once in protocol. Only superseded property changes are coalesced, failures show under the form, and `post` returns a result instead of throwing, which could have jammed the drag queue. A drag still in progress is released if the page's editor is removed.

A tab or iframe closed mid-drag can't send that release, so the machine stays held until something releases it. Fixing that needs a beacon or a timeout on the machine, which this ticket ruled out as a retry system.

Verified on a real page: an external update, an unsaved mass edit followed by a drag, refused drag and save writes, a network failure, and a normal drag and release. Tests cover patch merging and rejection.
