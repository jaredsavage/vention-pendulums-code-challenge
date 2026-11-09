const LOG_LENGTH = 500;

const clockTime = new Intl.DateTimeFormat('en', {
  timeStyle: 'medium',
  hourCycle: 'h23',
});

interface Entry {
  time: string;
  event: string;
  count: number;
}

// What's happened lately on this machine. Kept in memory only, and each
// machine is its own process, so each has its own log.
const entries: Entry[] = [];

// The same event again, straight after itself, is counted on its line, which
// then shows when it last happened.
export function log(event: string) {
  const time = clockTime.format(new Date());
  const last = entries.at(-1);
  if (last?.event === event) {
    last.count += 1;
    last.time = time;

    return;
  }

  entries.push({ time, event, count: 1 });
  if (entries.length > LOG_LENGTH) {
    entries.shift();
  }
}

// Newest first, so the latest is at the top without scrolling.
export function recentLog() {
  return entries.toReversed().map(({ time, event, count }) => {
    const repeats = count > 1 ? ` (${count} times)` : '';

    return `${time}  ${event}${repeats}`;
  });
}
