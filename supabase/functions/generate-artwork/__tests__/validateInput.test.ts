import { validateInput } from '../lib/validateInput.ts';

describe('validateInput', () => {
  it('should not throw for valid input', () => {
    expect(() => validateInput({ photoUrls: ['url'], userId: '1', collectionId: '2' })).not.toThrow();
  });
  it('should throw if photoUrls is empty', () => {
    expect(() => validateInput({ photoUrls: [], userId: '1', collectionId: '2' })).toThrow();
  });
  it('should throw if userId is missing', () => {
    expect(() => validateInput({ photoUrls: ['url'], userId: '', collectionId: '2' })).toThrow();
  });
  it('should throw if collectionId is missing', () => {
    expect(() => validateInput({ photoUrls: ['url'], userId: '1', collectionId: '' })).toThrow();
  });
  it('should throw if photoUrls contains non-string', () => {
    expect(() => validateInput({ photoUrls: [123 as any], userId: '1', collectionId: '2' })).toThrow();
  });
});
