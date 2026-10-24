export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
/** Worker/proxy failures can be plain text or HTML, including on JSON endpoints. */
// Generic callers provide an endpoint contract; legacy callers share api() compatibility.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readApiResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    /* Never expose proxy pages as UI errors. */
  }
  if (!res.ok) {
    const message =
      res.status === 401
        ? "Your session has expired. Sign in again to save your changes."
        : typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : res.status === 429
            ? "Too many requests. Wait a moment, then try again."
            : res.status >= 500
              ? "The service is temporarily unavailable. Your input has been kept. Please try again."
              : `The request could not be completed (${res.status}). Please try again.`;
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  if (!data || typeof data !== "object")
    throw new ApiError(
      "The service returned an unexpected response. Your input has been kept. Please try again.",
      res.status,
    );
  return data as T;
}
