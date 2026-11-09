import type { Express, Request, Response } from 'express';
import { commandSchema, machineCommandSchema } from '@repo/protocol';
import { configureMachine, dispatchExclusively } from './commands.ts';
import type { GroupRegistry } from './groups.ts';

const UNKNOWN_GROUP = 'Unknown group.';
const INVALID_COMMAND = 'Invalid command.';
const INVALID_MACHINE_COMMAND = 'Invalid machine command.';

type GroupRequest = Request<{ groupId: string }>;
type MachineRequest = Request<{ groupId: string; machineId: string }>;

export function registerRoutes(app: Express, registry: GroupRegistry) {
  function reportHealth(_request: Request, response: Response) {
    response.json({ ok: true });
  }

  function sendState(_request: Request, response: Response) {
    response.json(registry.snapshot());
  }

  // A command for the whole group. A refusal from any machine is a 409.
  async function sendToGroup(request: GroupRequest, response: Response) {
    const group = registry.get(request.params.groupId);
    if (!group) return refuse(response, 404, UNKNOWN_GROUP);

    const command = commandSchema.safeParse(request.body);
    if (!command.success) return refuse(response, 400, INVALID_COMMAND);

    const result = await dispatchExclusively(group, command.data, registry);
    response.status(result.ok ? 200 : 409).json(result);
  }

  // A command for one machine, which it can refuse with a 409.
  async function sendToMachine(request: MachineRequest, response: Response) {
    const { groupId, machineId } = request.params;
    const group = registry.get(groupId);
    if (!group) return refuse(response, 404, UNKNOWN_GROUP);

    const command = machineCommandSchema.safeParse(request.body);
    if (!command.success) return refuse(response, 400, INVALID_MACHINE_COMMAND);

    const result = await configureMachine(group, machineId, command.data);
    response.status(result.ok ? 200 : 409).json(result);
  }

  app.get('/api/health', reportHealth);
  app.get('/api/state', sendState);
  app.get('/api/state/stream', registry.watch);
  app.post('/api/groups/:groupId/command', sendToGroup);
  app.post('/api/groups/:groupId/machines/:machineId/command', sendToMachine);
}

// Answered the same way a machine refuses a command.
function refuse(response: Response, status: number, error: string) {
  response.status(status).json({ ok: false, error });
}
