import { useEffect, useEffectEvent, useState } from 'react';

// Calls the latest onFrame once per display frame,
// and returns how many frames ran in the last second.
export function useFrameLoop(onFrame: (now: number) => void) {
  const [frameRate, setFrameRate] = useState(0);
  const runOnFrame = useEffectEvent(onFrame);

  useEffect(() => {
    let request = 0;
    let framesThisSecond = 0;

    function runFrame(now: number) {
      request = requestAnimationFrame(runFrame);
      framesThisSecond += 1;
      runOnFrame(now);
    }

    function reportFrameRate() {
      setFrameRate(framesThisSecond);
      framesThisSecond = 0;
    }

    request = requestAnimationFrame(runFrame);
    const rateTimer = setInterval(reportFrameRate, 1000);

    return () => {
      cancelAnimationFrame(request);
      clearInterval(rateTimer);
    };
  }, []);

  return frameRate;
}
