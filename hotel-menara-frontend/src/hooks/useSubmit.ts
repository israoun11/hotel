import { useCallback, useRef, useState } from "react";
import { createSubmitGuard } from "../lib/submission";

/** Runs an async submission once at a time and exposes its `pending` state for the button. */
export function useSubmit() {
  const guard = useRef(createSubmitGuard());
  const [pending, setPending] = useState(false);
  const run = useCallback(async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    if (guard.current.running) return undefined;
    setPending(true);
    try {
      return await guard.current.run(task);
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, run };
}
