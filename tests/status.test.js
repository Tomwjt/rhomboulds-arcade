import { describe, expect, it } from 'vitest';
import { describeHealth, fetchHealth } from '../src/status.js';

const jsonResponse = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

describe('fetchHealth', () => {
  it('returns the payload when the endpoint reports ok', async () => {
    const data = { status: 'ok', version: '0.1.0', mode: 'production', builtAt: 'x' };
    expect(await fetchHealth('/health.json', jsonResponse(data))).toEqual({ ok: true, data });
  });

  it('fails on a non-2xx response', async () => {
    expect(await fetchHealth('/health.json', jsonResponse({}, 503))).toEqual({ ok: false, error: 'HTTP 503' });
  });

  it('fails when status is not ok', async () => {
    expect(await fetchHealth('/health.json', jsonResponse({ status: 'degraded' }))).toEqual({
      ok: false,
      error: 'status: degraded',
    });
  });

  it('fails when the request throws', async () => {
    const boom = async () => {
      throw new Error('network down');
    };
    expect(await fetchHealth('/health.json', boom)).toEqual({ ok: false, error: 'network down' });
  });
});

describe('describeHealth', () => {
  it('summarises a healthy result', () => {
    const data = { version: '0.1.0', mode: 'production', builtAt: '2026-01-01T00:00:00.000Z' };
    expect(describeHealth({ ok: true, data })).toBe('OK · v0.1.0 · production · built 2026-01-01T00:00:00.000Z');
  });

  it('summarises a failure', () => {
    expect(describeHealth({ ok: false, error: 'HTTP 503' })).toBe('Unavailable (HTTP 503)');
  });
});
