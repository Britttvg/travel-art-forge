import { generateArtworkWithAI } from '../lib/generateArtworkWithAI.ts';

describe('generateArtworkWithAI', () => {
  it('should throw for invalid/fake API', async () => {
    await expect(generateArtworkWithAI([], '', '', 'fake-key', 'fake-model')).rejects.toThrow();
  });
});
