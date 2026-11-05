/**
 * Resilient API fetcher with automatic exponential backoff and jitter for handling
 * HTTP 429 ("Rate exceeded / Too Many Requests") and transient network failures.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<Response> {
  let attempt = 0;

  while (true) {
    try {
      const res = await fetch(input, init);

      // If rate limited (HTTP 429) or temporary server throttling (HTTP 503)
      if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
        attempt++;

        // Check if server specified a Retry-After header
        const retryAfterHeader = res.headers.get('Retry-After');
        let delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;

        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            delayMs = Math.min(parsedSeconds * 1000, 5000); // cap retry-after at 5s for UI responsiveness
          }
        }

        console.warn(`[Network Retry] Rate limit or throttling detected (status ${res.status}). Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delayMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
        console.warn(`[Network Retry] Request error. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delayMs)}ms...`, err);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
}
