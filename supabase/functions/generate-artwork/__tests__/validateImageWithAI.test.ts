import { validateImageWithAI } from '../lib/validateImageWithAI.ts';

describe('validateImageWithAI', () => {
  it('should return a string for invalid/fake dataUrl', async () => {
    const result = await validateImageWithAI('data:image/png;base64,AAAA', 'fake-key', 'fake-model');
    expect(typeof result).toBe('string');
  });
});
