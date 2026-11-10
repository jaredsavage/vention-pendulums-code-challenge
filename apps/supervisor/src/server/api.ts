import type { Express, Request, Response } from 'express';
import type { EventStream } from '@repo/network';
import {
  commandSchema,
  editingChangeSchema,
  machineCommandSchema,
  type SupervisorState,
} from '@repo/protocol';
import { sendGroupCommand, sendMachineCommand, setEditing } from './sockets.ts';
import { supervisorState, type Groups } from './state.ts';

type GroupRequest = Request<{ groupId: string }>;
type MachineRequest = Request<{ groupId: string; machineId: string }>;

export function registerApi(
  app: Express,
  groups: Groups,
  browsers: EventStream<SupervisorState>,
) {
  const reportHealth = (_request: Request, response: Response) => {
    response.json({ ok: true });
  };

  const sendState = (_request: Request, response: Response) => {
    response.json(supervisorState(groups));
  };

  const openStream = (request: Request, response: Response) => {
    browsers.open(request, response, supervisorState(groups));
  };

  // A refusal from any machine is a 409.
  const sendToGroup = async (request: GroupRequest, response: Response) => {
    const group = groups.get(request.params.groupId);
    if (!group) return refuse(response, 404, 'Unknown group.');

    const command = commandSchema.safeParse(request.body);
    if (!command.success) return refuse(response, 400, 'Invalid command.');

    const result = await sendGroupCommand(group, command.data);
    response.status(result.ok ? 200 : 409).json(result);
  };

  const changeEditing = async (request: GroupRequest, response: Response) => {
    const group = groups.get(request.params.groupId);
    if (!group) return refuse(response, 404, 'Unknown group.');

    const change = editingChangeSchema.safeParse(request.body);
    if (!change.success) return refuse(response, 400, 'Invalid editing.');

    const result = await setEditing(group, change.data.editing);
    response.status(result.ok ? 200 : 409).json(result);
  };

  const sendToMachine = async (request: MachineRequest, response: Response) => {
    const { groupId, machineId } = request.params;
    const group = groups.get(groupId);
    if (!group) return refuse(response, 404, 'Unknown group.');

    const command = machineCommandSchema.safeParse(request.body);
    if (!command.success) {
      return refuse(response, 400, 'Invalid machine command.');
    }

    const result = await sendMachineCommand(group, machineId, command.data);
    response.status(result.ok ? 200 : 409).json(result);
  };

  // Health and reported state.
  app.get('/api/health', reportHealth);
  app.get('/api/state', sendState);
  app.get('/api/state/stream', openStream);

  // Commands for a group or one machine.
  app.post('/api/groups/:groupId/command', sendToGroup);
  app.post('/api/groups/:groupId/editing', changeEditing);
  app.post('/api/groups/:groupId/machines/:machineId/command', sendToMachine);
}

// Answered the same way a machine refuses a command.
function refuse(response: Response, status: number, error: string) {
  response.status(status).json({ ok: false, error });
}
