import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { GameLoop } from '@/core/GameLoop';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

/**
 * D0.2 G4 alignment notes — implemented semantics (src/core/GameLoop.ts):
 * - start() records lastTime = performance.now() and schedules exactly one rAF.
 * - run(time): accumulates (time - lastTime) into accumulatedTime; while the
 *   accumulator holds at least one timeStep (default 1000/60 ms at 60 FPS), it
 *   invokes updateCallback(timeStep / 1000) — a CONSTANT delta in seconds, not the
 *   frame delta — then invokes renderCallback exactly once per frame, and
 *   schedules the next frame.
 * - stop() cancels the scheduled frame and resets accumulatedTime to 0; a frame
 *   already scheduled before stop() is ignored (run() guards on isRunning).
 * - setFrameRate(fps) only changes the step size (1000 / fps ms); it does not
 *   start or stop the loop.
 *
 * The pre-G4 rAF mock invoked the callback synchronously, so start() recursed
 * (run -> requestAnimationFrame -> run -> ...) and blew the call stack
 * (RangeError: Maximum call stack size exceeded) — every test calling start()
 * failed. The mock now captures callbacks; `frame(t)` drives frames
 * deterministically with mocked performance.now().
 */
describe('GameLoop Class - Retroactive Tests', () => {
  let gameLoop: GameLoop;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockRender: ReturnType<typeof vi.fn>;
  let rafSpy: MockInstance<[callback: FrameRequestCallback], number>;
  let cafSpy: MockInstance<[handle: number], void>;
  let pendingFrames: Array<(time: number) => void>;

  beforeEach(() => {
    mockUpdate = vi.fn();
    mockRender = vi.fn();
    gameLoop = new GameLoop(mockUpdate, mockRender);

    pendingFrames = [];
    // Deterministic clock: start() reads lastTime = performance.now() = 0,
    // so frame(t) timestamps are deltas straight from zero.
    vi.spyOn(performance, 'now').mockReturnValue(0);
    // Non-recursive rAF: capture the callback instead of invoking it, so
    // frames only run when the test drives them via frame(t).
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
      pendingFrames.push(cb);
      return pendingFrames.length;
    });
    cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    gameLoop.stop();
    vi.restoreAllMocks();
  });

  /** Drive the loop through one display frame at the given timestamp (ms). */
  function frame(timestamp: number): void {
    const due = pendingFrames.splice(0, pendingFrames.length);
    due.forEach((cb) => cb(timestamp));
  }

  describe('Initialization', () => {
    it('should create GameLoop with callbacks', () => {
      expect(gameLoop).toBeDefined();
      expect(gameLoop.isLoopRunning()).toBe(false);
    });

    it('should accept update and render callbacks', () => {
      const loop = new GameLoop(vi.fn(), vi.fn());

      expect(loop).toBeDefined();
      expect(loop.isLoopRunning()).toBe(false);
    });
  });

  describe('Lifecycle', () => {
    it('should start the loop', () => {
      gameLoop.start();

      expect(gameLoop.isLoopRunning()).toBe(true);
      expect(rafSpy).toHaveBeenCalledTimes(1); // exactly one frame scheduled on start
    });

    it('should stop the loop', () => {
      gameLoop.start();
      frame(1000 / 60 + 1); // one fixed step consumed while running
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockRender).toHaveBeenCalledTimes(1);

      gameLoop.stop();

      expect(gameLoop.isLoopRunning()).toBe(false);
      expect(cafSpy).toHaveBeenCalledTimes(1);
      frame(1000 / 60 + 1); // a frame scheduled before stop() must be ignored
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should not start if already running', () => {
      gameLoop.start();
      gameLoop.start(); // the isRunning guard makes the second start a no-op

      expect(gameLoop.isLoopRunning()).toBe(true);
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('should not stop if not running', () => {
      gameLoop.stop();

      expect(gameLoop.isLoopRunning()).toBe(false);
      expect(cafSpy).not.toHaveBeenCalled();
    });
  });

  describe('Frame Rate Control', () => {
    it('should set frame rate', () => {
      gameLoop.setFrameRate(30);
      expect(gameLoop.isLoopRunning()).toBe(false); // setFrameRate does not start the loop
    });

    it('should support different frame rates', () => {
      gameLoop.setFrameRate(60);
      gameLoop.setFrameRate(120);
      gameLoop.setFrameRate(30);
      expect(gameLoop.isLoopRunning()).toBe(false);
    });
  });

  describe('Update and Render Callbacks', () => {
    it('should call update and render once per 60 Hz frame', () => {
      gameLoop.start();

      frame(1000 / 60 + 1);
      frame(2 * (1000 / 60) + 2);

      expect(mockUpdate).toHaveBeenCalledTimes(2); // one fixed step per frame at display = target
      expect(mockRender).toHaveBeenCalledTimes(2); // render runs once per frame
    });

    it('should skip update until accumulated time reaches the step, but still render', () => {
      gameLoop.start();

      frame(8); // 8 ms < 1000/60 ms step: no update, frame still renders
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalledTimes(1);

      frame(20); // advances 12 more ms: 20 ms accumulated >= step -> one update
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockRender).toHaveBeenCalledTimes(2);
    });

    it('should pass the fixed step in seconds to update, not the frame delta', () => {
      gameLoop.start();

      frame(3 * (1000 / 60) + 1); // 3 steps worth of frame time inside one frame

      expect(mockUpdate).toHaveBeenCalledTimes(3);
      // Each update receives timeStep/1000 s (= 1/60 s), constant, regardless of
      // how much frame time the step consumed.
      expect(mockUpdate).toHaveBeenNthCalledWith(1, 1 / 60);
      expect(mockUpdate).toHaveBeenNthCalledWith(2, 1 / 60);
      expect(mockUpdate).toHaveBeenNthCalledWith(3, 1 / 60);
    });
  });

  describe('Fixed Time Step', () => {
    it('should use 60 FPS (1000/60 ms) as the default step', () => {
      gameLoop.start();

      frame(3 * (1000 / 60) + 1); // just over 3 default steps
      expect(mockUpdate).toHaveBeenCalledTimes(3);

      frame(1); // +1 ms: far short of a 4th step
      expect(mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('should accumulate leftover time across frames', () => {
      gameLoop.start();

      frame(10); // 10 ms -> no update, 10 ms leftover
      frame(20); // +10 ms -> 20 ms >= step -> 1 update, ~3.33 ms leftover
      frame(30); // +10 ms -> ~13.33 ms -> still short
      frame(34); // +4 ms -> ~17.33 ms -> 2nd update

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockRender).toHaveBeenCalledTimes(4); // render still once per frame
    });

    it('should apply the step size set via setFrameRate', () => {
      gameLoop.setFrameRate(50); // 20 ms step
      gameLoop.start();

      frame(45); // 45 ms -> 2 steps of 20 ms, 5 ms leftover

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenLastCalledWith(0.02); // 20/1000 s
    });

    it('should reset the accumulated time on stop', () => {
      gameLoop.start();
      frame(30); // 30 ms -> 1 step, ~13.33 ms leftover
      expect(mockUpdate).toHaveBeenCalledTimes(1);

      gameLoop.stop();
      gameLoop.start();
      frame(10); // 10 ms since restart — the leftover must NOT have carried over
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
