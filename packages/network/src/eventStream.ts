import type { Request, Response } from 'express';

// Server-sent events to browsers, one snapshot per message.
export class EventStream<Snapshot> {
  private readonly responses = new Set<Response>();

  get hasViewers() {
    return this.responses.size > 0;
  }

  open(request: Request, response: Response, snapshot: Snapshot) {
    response.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    response.flushHeaders();
    response.write(frame(snapshot));

    this.responses.add(response);
    request.on('close', () => this.responses.delete(response));
  }

  // A browser that can't keep up skips snapshots rather than queueing stale
  // ones.
  send(snapshot: Snapshot) {
    const message = frame(snapshot);
    for (const response of this.responses) {
      if (!response.writableNeedDrain) {
        response.write(message);
      }
    }
  }
}

function frame(snapshot: unknown) {
  return `data: ${JSON.stringify(snapshot)}\n\n`;
}
