// After a stall, it catches up this much at most, then carries on.
const MAX_CATCH_UP_MS = 250;

// Calls step at a steady rate, with the same step size every time, however
// unevenly the timer fires. Timers drift, so it steps through the time that
// actually passed.
export function everyStep(
  stepsPerSecond: number,
  step: (seconds: number) => void,
) {
  const stepMs = 1000 / stepsPerSecond;
  const stepSeconds = stepMs / 1000;
  let lastTime = Date.now();
  let owedMs = 0;

  const catchUp = () => {
    const now = Date.now();
    const elapsedMs = now - lastTime;

    owedMs += Math.min(elapsedMs, MAX_CATCH_UP_MS);
    lastTime = now;

    while (owedMs >= stepMs) {
      step(stepSeconds);
      owedMs -= stepMs;
    }
  };

  const timer = setInterval(catchUp, stepMs);

  return () => clearInterval(timer);
}
