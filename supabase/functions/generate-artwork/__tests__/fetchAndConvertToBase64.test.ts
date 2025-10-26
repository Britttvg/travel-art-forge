import { fetchAndConvertToBase64 } from '../lib/fetchAndConvertToBase64';

describe('fetchAndConvertToBase64', () => {
  it('should throw for invalid url', async () => {
    await expect(fetchAndConvertToBase64('http://invalid-url-that-does-not-exist-12345.com')).rejects.toThrow();
  }, 10000); // 10 second timeout
});
