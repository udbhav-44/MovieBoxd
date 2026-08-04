/**
 * Runs `fn` over `items` with a bounded number of in-flight promises.
 * Results keep the input order; progress fires as each item settles.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  onSettled?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const total = items.length;
  let cursor = 0;
  let done = 0;

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, total)) },
    async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= total) return;

        results[index] = await fn(items[index], index);
        done += 1;
        onSettled?.(done, total);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
