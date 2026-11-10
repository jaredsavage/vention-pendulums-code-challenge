import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import type { EventStream } from '@repo/network';
import {
  environmentPatchSchema,
  machinePropertiesSchema,
} from '@repo/protocol';
import type { SimManagerState } from '../state.ts';
import { environmentNames, groupFileName } from './files.ts';
import type { MachineProcesses } from './machineProcesses.ts';

// Groups are chosen by their file names, and named as they're typed.
const groupsChoiceSchema = z.object({ groupFiles: z.array(z.string()) });
const groupChoiceSchema = z.object({ groupFile: z.string() });
const newGroupSchema = z.object({
  name: z.string(),
  duplicateOf: z.string().optional(),
});
const renameSchema = z.object({ groupFile: z.string(), name: z.string() });
const processChoiceSchema = z.object({ id: z.string() });

type MachineRequest = Request<{ id: string }>;
const environmentChoiceSchema = z.object({ name: z.enum(environmentNames) });

// HTTP 202 means the request was accepted. Process changes appear on the live stream.
export function registerApi(
  app: Express,
  machines: MachineProcesses,
  stream: EventStream<SimManagerState>,
) {
  const openStateStream = (request: Request, response: Response) => {
    stream.open(request, response, machines.state);
  };

  const selectGroups = (request: Request, response: Response) => {
    const choice = groupsChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, 'Unknown group.');

    const { groupFiles } = choice.data;
    const allKnown = groupFiles.every(isKnown);
    if (!allKnown) return refuse(response, 400, 'Unknown group.');

    void machines.selectGroups(groupFiles);
    accept(response);
  };

  const createGroup = (request: Request, response: Response) => {
    const newGroup = newGroupSchema.safeParse(request.body);
    if (!newGroup.success) return refuse(response, 400, 'Invalid new group.');

    const { name, duplicateOf } = newGroup.data;
    const problem = nameProblem(name);
    if (problem) return refuse(response, problem.status, problem.error);

    const unknownOriginal = duplicateOf !== undefined && !isKnown(duplicateOf);
    if (unknownOriginal) return refuse(response, 400, 'Unknown group.');

    void machines.createGroup(name, duplicateOf);
    accept(response);
  };

  // Running machines would still use the old group ID, so renaming requires
  // the group's machines to be shut down.
  const renameGroup = (request: Request, response: Response) => {
    const rename = renameSchema.safeParse(request.body);
    if (!rename.success) return refuse(response, 400, 'Invalid rename.');

    const { groupFile, name } = rename.data;
    if (!isKnown(groupFile)) return refuse(response, 400, 'Unknown group.');
    if (isRunning(groupFile)) {
      return refuse(
        response,
        409,
        "A group can only be renamed while it's off.",
      );
    }

    const problem = nameProblem(name);
    if (problem) return refuse(response, problem.status, problem.error);

    void machines.renameGroup(groupFile, name);
    accept(response);
  };

  const reloadGroups = (_request: Request, response: Response) => {
    machines.reloadGroups();
    accept(response);
  };

  const deleteGroup = (request: Request, response: Response) => {
    const choice = groupChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, 'Unknown group.');

    const { groupFile } = choice.data;
    if (!isKnown(groupFile)) return refuse(response, 400, 'Unknown group.');

    void machines.deleteGroup(groupFile);
    accept(response);
  };

  const addMachine = (request: Request, response: Response) => {
    const choice = groupChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, 'Unknown group.');

    const { groupFile } = choice.data;
    if (!isKnown(groupFile)) return refuse(response, 400, 'Unknown group.');

    void machines.addMachine(groupFile);
    accept(response);
  };

  const endProcess = (request: Request, response: Response) => {
    const choice = processChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, 'Unknown process.');

    const { id } = choice.data;
    if (!knownMachine(id)) return refuse(response, 400, 'Unknown process.');

    void machines.endProcess(id);
    accept(response);
  };

  // Machines keep their settings here, sending their properties whenever they
  // change.
  const saveSettings = (request: MachineRequest, response: Response) => {
    const machine = knownMachine(request.params.id);
    if (!machine) return refuse(response, 404, 'Unknown machine.');

    const properties = machinePropertiesSchema.safeParse(request.body);
    if (!properties.success) {
      return refuse(response, 400, 'Invalid properties.');
    }

    machines.keepSettings(machine.id, properties.data);
    accept(response);
  };

  const removeMachine = (request: MachineRequest, response: Response) => {
    const machine = knownMachine(request.params.id);
    if (!machine) return refuse(response, 404, 'Unknown machine.');

    machines.removeMachine(machine.id);
    accept(response);
  };

  const selectEnvironment = (request: Request, response: Response) => {
    const choice = environmentChoiceSchema.safeParse(request.body);
    if (!choice.success) return refuse(response, 400, 'Unknown environment.');

    void machines.selectEnvironment(choice.data.name);
    accept(response);
  };

  const changeEnvironment = (request: Request, response: Response) => {
    const changes = environmentPatchSchema.safeParse(request.body);
    if (!changes.success) {
      return refuse(response, 400, 'Invalid environment values.');
    }

    void machines.changeEnvironment(changes.data);
    accept(response);
  };

  const nameProblem = (name: string) => {
    const fileName = groupFileName(name);
    if (!fileName) return { status: 400, error: 'The group needs a name.' };

    const taken = isKnown(fileName);
    if (taken) {
      return { status: 409, error: 'There is already a group with that name.' };
    }

    return null;
  };

  const isKnown = (groupFile: string) =>
    machines.state.groups.some(({ file }) => file === groupFile);

  const knownMachine = (id: string) => {
    const { processes } = machines.state;

    return processes.find((machine) => machine.id === id);
  };

  const isRunning = (groupFile: string) => {
    const { processes } = machines.state;

    return processes.some((machine) => machine.groupFile === groupFile);
  };

  // Live process state.
  app.get('/api/state/stream', openStateStream);

  // Group selection, creation and changes.
  app.post('/api/groups', selectGroups);
  app.post('/api/groups/new', createGroup);
  app.post('/api/groups/rename', renameGroup);
  app.post('/api/groups/delete', deleteGroup);
  app.post('/api/groups/reload', reloadGroups);
  app.post('/api/groups/add-machine', addMachine);

  // Individual processes.
  app.post('/api/processes/end', endProcess);

  // Machine property persistence and deletion.
  app.put('/api/machines/:id/settings', saveSettings);
  app.delete('/api/machines/:id/settings', removeMachine);

  // Environment selection and live values.
  app.post('/api/environment', selectEnvironment);
  app.post('/api/environment/values', changeEnvironment);
}

function accept(response: Response) {
  response.status(202).json({ ok: true });
}

function refuse(response: Response, status: number, error: string) {
  response.status(status).json({ ok: false, error });
}
