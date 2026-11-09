import type { MachineProperties, PositionUpdate } from '@repo/protocol';
import type { Bob } from './collision.ts';

const QUIET_TIMEOUT_MS = 1500;

// Everything heard from one peer. Unknown until it reports.
interface Peer {
  properties: MachineProperties | null;
  position: PositionUpdate | null;
  positionCount: number;
  lastHeard: number;
}

// What this machine has heard from every peer. It all came over the peer's
// connection, so it's forgotten when that ends.
export class PeerReports {
  private readonly peers = new Map<string, Peer>();

  properties(id: string) {
    return this.peers.get(id)?.properties ?? null;
  }

  // The peer's bob as it last reported it.
  bob(id: string): Bob | null {
    const peer = this.peers.get(id);
    if (!peer?.position || !peer.properties) return null;

    const { position } = peer.position;
    const { radius } = peer.properties;

    return { position, radius };
  }

  // How many positions each peer has sent since this was last asked, starting
  // the count again.
  takePositionCounts() {
    const counts = new Map<string, number>();
    for (const [id, peer] of this.peers) {
      counts.set(id, peer.positionCount);
      peer.positionCount = 0;
    }

    return counts;
  }

  // Only the watched peers owe reports. Everyone else's clock is restarted, so
  // a peer that's newly watched has time to report in.
  restartClocksExcept(watched: string[], now: number) {
    for (const [id, peer] of this.peers) {
      if (!watched.includes(id)) {
        peer.lastHeard = now;
      }
    }
  }

  anyQuiet(watched: string[], now: number) {
    return watched.some((id) => {
      const lastHeard = this.peers.get(id)?.lastHeard ?? now;

      return now - lastHeard > QUIET_TIMEOUT_MS;
    });
  }

  heardProperties(id: string, properties: MachineProperties) {
    this.peer(id).properties = properties;
  }

  heardPosition(update: PositionUpdate, now: number) {
    const peer = this.peer(update.senderId);

    peer.position = update;
    peer.positionCount += 1;
    peer.lastHeard = now;
  }

  // Positions belong to a run, so a new run starts without them.
  forgetPositions() {
    for (const peer of this.peers.values()) {
      peer.position = null;
      peer.positionCount = 0;
    }
  }

  forget(id: string) {
    this.peers.delete(id);
  }

  private peer(id: string) {
    const known = this.peers.get(id);
    if (known) return known;

    const peer = {
      properties: null,
      position: null,
      positionCount: 0,
      lastHeard: Date.now(),
    };
    this.peers.set(id, peer);

    return peer;
  }
}
