import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@/utils/Logger';

describe('Logger - Retroactive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Logger Methods', () => {
    it('should have info method', () => {
      expect(typeof Logger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof Logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof Logger.error).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof Logger.debug).toBe('function');
    });
  });

  describe('Logging Behavior', () => {
    it('should accept message and optional data', () => {
      expect(() => Logger.info('Test message')).not.toThrow();
      expect(() => Logger.info('Test message', { key: 'value' })).not.toThrow();
    });

    it('should accept error objects', () => {
      expect(() => Logger.error('Error message', new Error('Test'))).not.toThrow();
    });
  });

  describe('Log Levels', () => {
    it('should support info level logging', () => {
      expect(() => Logger.info('Info message')).not.toThrow();
    });

    it('should support warn level logging', () => {
      expect(() => Logger.warn('Warning message')).not.toThrow();
    });

    it('should support error level logging', () => {
      expect(() => Logger.error('Error message')).not.toThrow();
    });

    it('should support debug level logging', () => {
      expect(() => Logger.debug('Debug message')).not.toThrow();
    });
  });
});
