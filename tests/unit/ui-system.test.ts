import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UISystem } from '@/systems/UI';
import type { UIConfig } from '@/types/GameTypes';

/**
 * W3A.1 (Task 8.1, kanban t_16f7e67d) — UISystem CORE: real HUD.
 *
 * D2 (HUD-ownership ruling): the HUD DOM lives in systems/UI.ts, not in
 * GameScene.ts. This suite pins the public surface of the system:
 *   - constructor(config: UIConfig) / update(deltaTime) / cleanup()
 *     (preserved so src/core/Game.ts keeps working unchanged)
 *   - setScore(n) / setHealth(h) / setLevel(l)
 *   - setPowerUpIndicator(...) — stub for the W3 power-up cards
 *
 * TDD evidence:
 *   RED:  the pre-implementation 32-line no-op stub creates no HUD divs and
 *         exposes no set* methods — every test below fails against it
 *         (captured in tests/evidence/w3/W3A1-RED.txt).
 *   GREEN: real implementation in src/systems/UI.ts
 *          (captured in tests/evidence/w3/W3A1-GREEN.txt).
 *
 * Layout contract (must match GameScene's current inline HUD so the visible
 * HUD is unchanged):
 *   #game-score  — position:fixed; top:10px; left:10px;  24px monospace
 *   #game-health — position:fixed; top:10px; right:10px; 24px monospace
 *   #game-level  — position:fixed; top:50px; left:10px;  18px monospace
 *   all: color white; text-shadow 2px 2px 2px black; z-index 100;
 *        display:none until the game sets values.
 *   text formats: "SCORE: n" / "HEALTH: n" / "LEVEL: n"
 */

const UI_CONFIG: UIConfig = {
  theme: 'dark',
  fontSize: 16,
  showFPS: true,
  showDebug: false
};

const HUD_IDS = ['game-score', 'game-health', 'game-level'] as const;

describe('W3A.1 UISystem core (Task 8.1 — real HUD, D2 HUD ownership)', () => {
  let ui: UISystem;

  beforeEach(() => {
    document.body.innerHTML = '';
    ui = new UISystem(UI_CONFIG);
  });

  afterEach(() => {
    ui.cleanup();
    document.body.innerHTML = '';
  });

  describe('HUD creation', () => {
    it('creates #game-score / #game-health / #game-level divs attached to body', () => {
      for (const id of HUD_IDS) {
        const el = document.getElementById(id);
        expect(el, `#${id} should exist`).toBeTruthy();
        expect(el!.tagName).toBe('DIV');
        expect(el!.parentNode).toBe(document.body);
      }
    });

    it('HUD starts hidden (display:none) until the game sets values', () => {
      for (const id of HUD_IDS) {
        expect(document.getElementById(id)!.style.display).toBe('none');
      }
    });

    it('matches the GameScene layout: score top-left, health top-right, level below score', () => {
      const score = document.getElementById('game-score')!;
      const health = document.getElementById('game-health')!;
      const level = document.getElementById('game-level')!;

      for (const el of [score, health, level]) {
        expect(el.style.position).toBe('fixed');
        expect(el.style.color).toBe('white');
        expect(el.style.fontFamily).toContain('monospace');
        expect(el.style.zIndex).toBe('100');
        expect(el.style.textShadow).toContain('black');
      }

      expect(score.style.top).toBe('10px');
      expect(score.style.left).toBe('10px');
      expect(score.style.fontSize).toBe('24px');

      expect(health.style.top).toBe('10px');
      expect(health.style.right).toBe('10px');
      expect(health.style.fontSize).toBe('24px');

      expect(level.style.top).toBe('50px');
      expect(level.style.left).toBe('10px');
      expect(level.style.fontSize).toBe('18px');
    });

    it('shows the HUD (display:block) once values are set', () => {
      ui.setScore(0);
      ui.setHealth(100);
      ui.setLevel(1);
      for (const id of HUD_IDS) {
        expect(document.getElementById(id)!.style.display).toBe('block');
      }
    });
  });

  describe('setScore / setHealth / setLevel', () => {
    it('setScore(n) updates #game-score textContent to "SCORE: n"', () => {
      ui.setScore(0);
      expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 0');
      ui.setScore(25);
      expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 25');
      ui.setScore(1250);
      expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 1250');
    });

    it('setHealth(h) updates #game-health textContent to "HEALTH: h"', () => {
      ui.setHealth(100);
      expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 100');
      ui.setHealth(75);
      expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 75');
      ui.setHealth(0);
      expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 0');
    });

    it('setLevel(l) updates #game-level textContent to "LEVEL: l"', () => {
      ui.setLevel(1);
      expect(document.getElementById('game-level')!.textContent).toBe('LEVEL: 1');
      ui.setLevel(3);
      expect(document.getElementById('game-level')!.textContent).toBe('LEVEL: 3');
    });

    it('setters are callable any number of times (per-frame HUD refresh)', () => {
      for (let i = 0; i < 5; i += 1) {
        ui.setScore(i);
        ui.setHealth(100 - i * 10);
        ui.setLevel(1);
      }
      expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 4');
      expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 60');
    });
  });

  describe('public surface (Game.ts call shape + W3 additions)', () => {
    it('keeps the documented Game.ts surface (constructor + update + cleanup)', () => {
      // src/core/Game.ts:55 `new UISystem(config.ui)`, game loop
      // `this.uiSystem.update(deltaTime)`, teardown `this.uiSystem.cleanup()`.
      expect(() => ui.update(0.016)).not.toThrow();
      expect(ui.update(0.016)).toBeUndefined();
      expect(() => ui.cleanup()).not.toThrow();
    });

    it('exposes setScore, setHealth, setLevel, setPowerUpIndicator', () => {
      const protoNames = Object.getOwnPropertyNames(Object.getPrototypeOf(ui));
      for (const m of ['cleanup', 'setHealth', 'setLevel', 'setPowerUpIndicator', 'setScore', 'update']) {
        expect(protoNames, `method ${m} missing`).toContain(m);
      }
    });

    it('setPowerUpIndicator() is a safe no-op stub (W3 power-up cards build the indicator UI)', () => {
      expect(() => ui.setPowerUpIndicator(null)).not.toThrow();
      expect(() => ui.setPowerUpIndicator({ id: 'shield', label: 'SHIELD' })).not.toThrow();
    });
  });

  describe('window resize responsiveness', () => {
    it('registers a window resize handler (repositions HUD on resize)', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      let fresh: UISystem;
      let resizeCalls: unknown[][] = [];
      try {
        addSpy.mockClear();
        fresh = new UISystem(UI_CONFIG);
        // Read BEFORE mockRestore() — restore() clears the call log.
        resizeCalls = addSpy.mock.calls.filter((c) => c[0] === 'resize');
      } finally {
        addSpy.mockRestore();
      }
      expect(resizeCalls.length).toBeGreaterThanOrEqual(1);
      // The handler must be removable (cleanup unregisters it).
      fresh.cleanup();
    });

    it('resize event leaves the HUD divs attached and correctly positioned', () => {
      ui.setScore(5);
      ui.setHealth(50);
      ui.setLevel(2);

      window.dispatchEvent(new Event('resize'));

      const score = document.getElementById('game-score')!;
      const health = document.getElementById('game-health')!;
      const level = document.getElementById('game-level')!;
      expect(score.parentNode).toBe(document.body);
      expect(health.parentNode).toBe(document.body);
      expect(level.parentNode).toBe(document.body);
      expect(score.style.position).toBe('fixed');
      expect(score.textContent).toBe('SCORE: 5');
      expect(health.textContent).toBe('HEALTH: 50');
      expect(level.textContent).toBe('LEVEL: 2');
    });
  });

  describe('cleanup', () => {
    it('cleanup() removes the HUD divs from the DOM', () => {
      ui.setScore(0);
      ui.setHealth(100);
      ui.setLevel(1);
      ui.cleanup();
      for (const id of HUD_IDS) {
        expect(document.getElementById(id)).toBeNull();
      }
    });

    it('cleanup() is idempotent (Game.cleanup() may run repeatedly)', () => {
      ui.cleanup();
      expect(() => ui.cleanup()).not.toThrow();
      expect(() => ui.cleanup()).not.toThrow();
    });

    it('update() + cleanup() after cleanup stay no-throw', () => {
      ui.cleanup();
      expect(() => ui.update(0.016)).not.toThrow();
      expect(() => ui.setScore(1)).not.toThrow();
      expect(() => ui.setHealth(1)).not.toThrow();
      expect(() => ui.setLevel(1)).not.toThrow();
    });
  });
});

