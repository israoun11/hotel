/**
 * Prevents duplicate submissions: while a submission is running, further calls are ignored
 * (double clicks, Enter pressed twice...). Returns `undefined` for an ignored call.
 */
export function createSubmitGuard() {
  let running = false;
  return {
    get running() {
      return running;
    },
    async run<T>(task: () => Promise<T>): Promise<T | undefined> {
      if (running) return undefined;
      running = true;
      try {
        return await task();
      } finally {
        running = false;
      }
    },
  };
}
