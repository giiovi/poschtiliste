import type { ErrorRequestHandler } from "express";

import { ValidationError } from "../errors/validation-error";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  // Express identifies error middleware by its four-argument signature.
  void _next;

  if (error instanceof ValidationError) {
    response.status(error.status).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Internal server error" });
};
