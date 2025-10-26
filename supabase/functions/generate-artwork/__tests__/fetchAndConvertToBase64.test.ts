import { fetchAndConvertToBase64 } from '../lib/fetchAndConvertToBase64.ts';

describe('fetchAndConvertToBase64', () => {
  it('should throw for invalid url', async () => {
    await expect(fetchAndConvertToBase64('http://invalid-url')).rejects.toThrow();
  });
  // Integration test for a real image URL can be added if needed
});
