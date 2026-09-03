export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function toHttpError(err: unknown, fallback = 'Request failed'): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return new ApiError(err.message, 400);
  return new ApiError(fallback, 400);
}
