/**
 * Wraps an API call with automatic retry on network errors.
 * Used on auth pages to handle Render.com cold-start delays gracefully.
 */
export async function withApiRetry<T>(
  fn: () => Promise<T>,
  onWaiting?: (attempt: number, maxAttempts: number) => void,
  maxRetries = 3,
  delayMs = 2500
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      const isNetworkError =
        err?.code === 'ERR_NETWORK' ||
        err?.code === 'ECONNABORTED' ||
        err?.code === 'ECONNREFUSED' ||
        (!err?.response && !err?.status)
      if (attempt < maxRetries && isNetworkError) {
        onWaiting?.(attempt, maxRetries)
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
      } else {
        throw err
      }
    }
  }
  throw lastError
}
