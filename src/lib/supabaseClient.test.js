import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('supabaseClient configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('throws a clear error when Supabase env vars are missing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(import('./supabaseClient.js')).rejects.toThrow(/VITE_SUPABASE_URL.*VITE_SUPABASE_ANON_KEY/i);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('creates a client when both env vars are set', async () => {
    const createClientSpy = vi.fn(() => ({ auth: {} }));
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: createClientSpy,
    }));

    const mod = await import('./supabaseClient.js');

    expect(createClientSpy).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
    expect(mod.supabase).toEqual({ auth: {} });
  });
});
