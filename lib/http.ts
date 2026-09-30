// Respuestas de la API /v1: siempre JSON, siempre con la cabecera Request-Id y errores con el formato de Stripe (ADR-005).
import type { ZodError } from "zod";
import { newId } from "./ids.ts";

export function ok(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Request-Id": newId("req") } });
}

type ErrorType = "invalid_request_error" | "authentication_error" | "api_error";

export function apiError(status: number, type: ErrorType, code: string, message: string, param?: string): Response {
  return ok({ error: { type, code, message, ...(param && { param }) } }, status);
}

export const unauthorized = () =>
  apiError(401, "authentication_error", "api_key_invalid", "Missing or invalid API key. Use 'Authorization: Bearer sk_…'.");

export const notFound = (object: string, id: string) =>
  apiError(404, "invalid_request_error", "resource_missing", `No such ${object}: '${id}'.`);

// Traduce el primer error de validación de zod a un 400 que dice qué parámetro está mal.
export function invalidParams(error: ZodError): Response {
  const issue = error.issues[0];
  const param = issue.code === "unrecognized_keys" ? issue.keys[0] : String(issue.path[0]);
  return apiError(400, "invalid_request_error", "parameter_invalid", `Invalid parameter '${param}': ${issue.message}`, param);
}

// Lee el cuerpo JSON; si no es JSON válido devuelve undefined.
export const readJson = (request: Request): Promise<unknown> => request.json().catch(() => undefined);

export const invalidJson = () =>
  apiError(400, "invalid_request_error", "parameter_invalid", "The request body must be valid JSON.");
