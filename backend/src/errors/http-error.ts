export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message);
  }
}
