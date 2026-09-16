export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, "VALIDATION_FAILED", message, details);
export const unauthorized = (message = "Authentication required") => new HttpError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have permission to perform this action") => new HttpError(403, "FORBIDDEN", message);
export const notFound = (what = "Resource") => new HttpError(404, "NOT_FOUND", `${what} not found`);
export const conflict = (message: string) => new HttpError(409, "CONFLICT", message);
export const tooManyRequests = (message = "Too many requests. Please try again later.") => new HttpError(429, "RATE_LIMITED", message);
