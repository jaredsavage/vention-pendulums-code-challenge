import { useEffect, useState } from 'react';
import { simManagerStateSchema, type SimManagerState } from '../state.ts';
import { api } from './api.ts';
import { EnvironmentSection } from './EnvironmentSection.tsx';
import { GroupChecklist } from './GroupChecklist.tsx';
import { ProcessList } from './ProcessList.tsx';

export function App() {
  const [state, setState] = useState<SimManagerState>();

  useEffect(() => {
    const stream = api.openStateStream();
    stream.onmessage = ({ data }: MessageEvent<string>) => {
      setState(simManagerStateSchema.parse(JSON.parse(data)));
    };

    return () => stream.close();
  }, []);

  if (!state) return null;

  return (
    <>
      <main>
        <h1>
          Sim Manager
          <small>Manage simulated machines</small>
        </h1>
        <div>
          <GroupChecklist
            groups={state.groups}
            selected={state.selectedGroups}
          />
          <EnvironmentSection
            environments={state.environments}
            selected={state.environment}
            values={state.environmentValues}
          />
          <ProcessList processes={state.processes} />
        </div>
      </main>
      <article>
        <iframe src={state.supervisorUrl} title="Supervisor" />
      </article>
    </>
  );
}
