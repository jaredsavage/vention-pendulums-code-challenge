import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import type { EventStream } from '@repo/network';
import { environmentPatchSchema } from '@repo/protocol';
import type { SimManagerState } from '../state.ts';
import { environmentNames } from './environments.ts';
import { groupFileName } from './groupFiles.ts';
import type { MachineProcesses } from './machineProcesses.ts';

const UNKNOWN_GROUP = 'Unknown group.';
const GROUP_NOT_RUNNING = "That group isn't running.";
const INVALID_NEW_GROUP = 'Invalid new group.';
const NAME_NEEDED = 'The group needs a name.';
const NAME_TAKEN = 'There is already a group with that name.';
const UNKNOWN_PROCESS = 'Unknown process.';
const UNKNOWN_ENVIRONMENT = 'Unknown environment.';
const INVALID_VALUES = 'Invalid environment values.';

const groupsChoiceSchema = z.object({ names: z.array(z.string()) });
const groupChoiceSchema = z.object({ name: z.string() });
const newGroupSchema = z.object({
  name: z.string(),
  copyOf: z.string().optional(),
});
const processChoiceSchema = z.object({ id: z.string() });
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

    const { names } = choice.data;
    const allKnown = names.every((name) =>
      machines.state.groups.includes(name),
    );
    if (!allKnown) return refuse(response, 400, UNKNOWN_GROUP);

    void machines.selectGroups(names);
    accept(response);
  }

  // A new group needs a file name nothing else has. A copy has to be of a
  // running group, which has machines to copy.
  function createGroup(request: Request, response: Response) {
    const newGroup = newGroupSchema.safeParse(request.body);
    if (!newGroup.success) return refuse(response, 400, INVALID_NEW_GROUP);

    const { name, copyOf } = newGroup.data;
    const fileName = groupFileName(name);
    if (!fileName) return refuse(response, 400, NAME_NEEDED);

    const nameTaken = machines.state.groups.includes(fileName);
    if (nameTaken) return refuse(response, 409, NAME_TAKEN);

    const copyNotRunning = copyOf !== undefined && !isRunning(copyOf);
    if (copyNotRunning) return refuse(response, 409, GROUP_NOT_RUNNING);

    void machines.createGroup(name, copyOf);
    accept(response);
  }

  function updateGroupFile(request: Request, response: Response) {
    const groupFile = runningGroupIn(request, response);
    if (!groupFile) return;

    void machines.updateGroupFile(groupFile);
    accept(response);
  }

  function addMachine(request: Request, response: Response) {
    const groupFile = runningGroupIn(request, response);
    if (!groupFile) return;

    void machines.addMachine(groupFile);
    accept(response);
  }

  function endProcess(request: Request, response: Response) {
    const choice = processChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, UNKNOWN_PROCESS);

    const { id } = choice.data;
    const known = machines.state.processes.some((machine) => machine.id === id);
    if (!known) return refuse(response, 400, UNKNOWN_PROCESS);

    void machines.endProcess(id);
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

  // Updating and adding to a group both need its machines running. The group
  // the request names, or nothing when the request's been turned away.
  function runningGroupIn(request: Request, response: Response) {
    const choice = groupChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, UNKNOWN_GROUP);

    const { name } = choice.data;
    if (!isRunning(name)) return refuse(response, 409, GROUP_NOT_RUNNING);

    return name;
  }

  function isRunning(groupFile: string) {
    const { processes } = machines.state;

    return processes.some((machine) => machine.groupFile === groupFile);
  }

  app.get('/api/state/stream', openStateStream);
  app.post('/api/groups', selectGroups);
  app.post('/api/groups/new', createGroup);
  app.post('/api/groups/update', updateGroupFile);
  app.post('/api/groups/add-machine', addMachine);
  app.post('/api/processes/end', endProcess);
  app.post('/api/environment', selectEnvironment);
  app.post('/api/environment/values', changeEnvironment);
}

function accept(response: Response) {
  response.status(202).json({ ok: true });
}

function refuse(response: Response, status: number, error: string) {
  response.status(status).json({ ok: false, error });
}
