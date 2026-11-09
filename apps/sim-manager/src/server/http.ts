import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import type { EventStream } from '@repo/network';
import { environmentPatchSchema } from '@repo/protocol';
import type { SimManagerState } from '../state.ts';
import { environmentNames, groupNames } from './data.ts';
import type { MachineProcesses } from './machineProcesses.ts';

const UNKNOWN_GROUP = 'Unknown group.';
const UNKNOWN_ENVIRONMENT = 'Unknown environment.';
const INVALID_VALUES = 'Invalid environment values.';

const groupsChoiceSchema = z.object({ names: z.array(z.enum(groupNames)) });
const environmentChoiceSchema = z.object({ name: z.enum(environmentNames) });

// Answered like the supervisor's commands. Accepted changes happen after the
// answer, and show up on the live stream.
export function registerRoutes(
  app: Express,
  machines: MachineProcesses,
  stream: EventStream<SimManagerState>,
) {
  function openStateStream(request: Request, response: Response) {
    stream.open(request, response, machines.state);
  }

  function selectGroups(request: Request, response: Response) {
    const choice = groupsChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, UNKNOWN_GROUP);

    void machines.selectGroups(choice.data.names);
    accept(response);
  }

  function selectEnvironment(request: Request, response: Response) {
    const choice = environmentChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, UNKNOWN_ENVIRONMENT);

    void machines.selectEnvironment(choice.data.name);
    accept(response);
  }

  function changeEnvironment(request: Request, response: Response) {
    const changes = environmentPatchSchema.safeParse(request.body);
    if (!changes.success) return refuse(response, 400, INVALID_VALUES);

    void machines.changeEnvironment(changes.data);
    accept(response);
  }

  app.get('/api/state/stream', openStateStream);
  app.post('/api/groups', selectGroups);
  app.post('/api/environment', selectEnvironment);
  app.post('/api/environment/values', changeEnvironment);
}

function accept(response: Response) {
  response.status(202).json({ ok: true });
}

function refuse(response: Response, status: number, error: string) {
  response.status(status).json({ ok: false, error });
}
