import { describe, it, expect, vi } from 'vitest';
import { hello } from '../src/index';

describe('fetch', () => {
  it('should run hello', () => {
    expect(typeof hello).toBe('function');
  });
});
