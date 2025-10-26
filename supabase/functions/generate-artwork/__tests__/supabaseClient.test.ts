import { getSupabaseClient } from '../lib/supabaseClient.ts';

describe('getSupabaseClient', () => {
  it('should be a function', () => {
    expect(typeof getSupabaseClient).toBe('function');
  });
});
