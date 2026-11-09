const RESTART_DELAY_MS = 5000;

// After a collision, the whole group stops. Once every machine has, they all
// restart together a few seconds later.
export class Recovery {
  readonly collision: string[];
  restartAt: number | null = null;
  private readonly ready = new Set<string>();

  constructor(collision: string[], ownId: string) {
    this.collision = collision;
    this.ready.add(ownId);
  }

  markReady(id: string) {
    this.ready.add(id);
  }

  scheduleOnceAllReady(memberIds: string[], now: number) {
    const scheduled = this.restartAt !== null;
    const allReady = memberIds.every((id) => this.ready.has(id));
    if (scheduled || !allReady) return;

    this.restartAt = now + RESTART_DELAY_MS;
  }

  isDue(now: number) {
    return this.restartAt !== null && now >= this.restartAt;
  }
}
