import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@/utils/Logger';

describe('Logger - Retroactive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore default level so tests never leak into each other.
    Logger.setLevel('info');
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

  // ==========================================================================
  // W1-C gap-fill (t_fa4d5774): measure() / group() / groupEnd()
  // Retroactive: asserts CURRENT behavior of the frozen production code.
  // These paths are gated on the DEBUG level (Logger.ts:61-91).
  // ==========================================================================
  describe('measure (W1-C gap-fill)', () => {
    it('returns the function result at debug level and brackets with console.time/timeEnd', () => {
      Logger.setLevel('debug');
      const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
      const timeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});

      const result = Logger.measure('block', () => 42);

      expect(result).toBe(42);
      expect(timeSpy).toHaveBeenCalledWith('block');
      expect(timeEndSpy).toHaveBeenCalledWith('block');
      timeSpy.mockRestore();
      timeEndSpy.mockRestore();
    });

    it('skips timing but still returns the function result at info level', () => {
      Logger.setLevel('info');
      const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});

      const result = Logger.measure('block', () => 'fast');

      expect(result).toBe('fast');
      expect(timeSpy).not.toHaveBeenCalled();
      timeSpy.mockRestore();
    });

    it('propagates errors thrown by the measured function', () => {
      Logger.setLevel('debug');
      vi.spyOn(console, 'time').mockImplementation(() => {});
      vi.spyOn(console, 'timeEnd').mockImplementation(() => {});

      expect(() => Logger.measure('boom', () => {
        throw new Error('measured fn failed');
      })).toThrow('measured fn failed');
    });
  });

  describe('group / groupEnd (W1-C gap-fill)', () => {
    it('group opens an expanded console group at debug level', () => {
      Logger.setLevel('debug');
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      Logger.group('MyGroup');

      expect(groupSpy).toHaveBeenCalledWith('MyGroup');
      groupSpy.mockRestore();
    });

    it('group opens a collapsed console group when collapsed=true', () => {
      Logger.setLevel('debug');
      const collapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});

      Logger.group('MyGroup', true);

      expect(collapsedSpy).toHaveBeenCalledWith('MyGroup');
      collapsedSpy.mockRestore();
    });

    it('group is silent at non-debug levels', () => {
      Logger.setLevel('info');
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      Logger.group('Silent');

      expect(groupSpy).not.toHaveBeenCalled();
      groupSpy.mockRestore();
    });

    it('groupEnd closes the group at debug level', () => {
      Logger.setLevel('debug');
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      Logger.groupEnd();

      expect(groupEndSpy).toHaveBeenCalled();
      groupEndSpy.mockRestore();
    });

    it('groupEnd is silent at non-debug levels', () => {
      Logger.setLevel('info');
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      Logger.groupEnd();

      expect(groupEndSpy).not.toHaveBeenCalled();
      groupEndSpy.mockRestore();
    });
  });
});
