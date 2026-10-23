/** Tiny fetch double for unit tests: records calls and answers with queued responses. */
export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

type Answer = { status: number; body?: unknown; raw?: string } | Error | "hang";

export function mockFetch(...answers: Answer[]) {
  const calls: RecordedCall[] = [];
  const impl = (async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    const answer = answers.length > 1 ? answers.shift()! : answers[0];
    if (answer instanceof Error) throw answer;
    if (answer === "hang") {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    }
    const text = answer.raw ?? (answer.body === undefined ? "" : JSON.stringify(answer.body));
    return new Response(answer.status === 204 ? null : text, { status: answer.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { impl, calls };
}

export const ok = <T>(data: T, meta?: Record<string, unknown>) => ({ status: 200, body: meta ? { success: true, data, meta } : { success: true, data } });
export const fail = (status: number, code: string, message = code, details?: unknown) => ({
  status,
  body: { success: false, error: details ? { code, message, details } : { code, message } },
});
