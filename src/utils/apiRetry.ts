export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries: number = 2,
  backoffMs: number = 300
): Promise<Response> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(input, init);
      return response;
    } catch (err) {
      if (attempt >= retries) {
        throw err;
      }
      attempt++;
      await new Promise((res) => setTimeout(res, backoffMs * attempt));
    }
  }
  return fetch(input, init);
}
