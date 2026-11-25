/**
 * Fetches the health payload and normalises the result so the UI only
 * has to handle { ok: true, data } or { ok: false, error }.
 */
export async function fetchHealth(url, fetchFn = globalThis.fetch) {
  try {
    const res = await fetchFn(url, { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    if (data?.status !== 'ok') return { ok: false, error: `status: ${data?.status ?? 'unknown'}` };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Text shown next to the status dot. */
export function describeHealth(result) {
  if (!result.ok) return `Unavailable (${result.error})`;
  const { version, mode, builtAt } = result.data;
  return `OK · v${version} · ${mode} · built ${builtAt}`;
}
