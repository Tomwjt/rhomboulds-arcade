import { describe, expect, it } from 'vitest';
import { buildHealthPayload } from '../src/health.js';

describe('buildHealthPayload', () => {
  it('reports ok with name, version, mode and an ISO build time', () => {
    const builtAt = new Date('2026-01-01T00:00:00Z');
    expect(buildHealthPayload({ name: 'arcade', version: '1.2.3', mode: 'production', builtAt })).toEqual({
      status: 'ok',
      name: 'arcade',
      version: '1.2.3',
      mode: 'production',
      builtAt: '2026-01-01T00:00:00.000Z',
    });
  });
});
