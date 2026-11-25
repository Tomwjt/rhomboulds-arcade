/**
 * Builds the payload served at /health.json.
 * Kept free of Vite/Node specifics so it can be unit tested directly.
 */
export function buildHealthPayload({ name, version, mode, builtAt = new Date() }) {
  return {
    status: 'ok',
    name,
    version,
    mode,
    builtAt: builtAt.toISOString(),
  };
}
