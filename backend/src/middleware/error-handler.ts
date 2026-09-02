import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  // Express identifies error middleware by its four-argument signature.
  void _next;
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
};
