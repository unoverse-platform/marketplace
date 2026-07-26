/**
 * Await a component submission — auto-generated (component-output contract).
 * The promise resolves when the data plane receives the user's `submit`
 * (user_action with componentState) for this chatId:nodeId. It never times out
 * by design: an unanswered form is a workflow that never finishes.
 */
type Resolver = (state: Record<string, any>) => void;

function registry(): Map<string, Resolver[]> {
  const g = globalThis as any;
  if (!g.__unoverseSubmissionWaiters) g.__unoverseSubmissionWaiters = new Map<string, Resolver[]>();
  return g.__unoverseSubmissionWaiters as Map<string, Resolver[]>;
}

export function awaitSubmission(key: string): Promise<Record<string, any>> {
  return new Promise<Record<string, any>>((resolve) => {
    const m = registry();
    const list = m.get(key) ?? [];
    list.push(resolve);
    m.set(key, list);
  });
}
