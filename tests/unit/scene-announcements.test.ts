/**
 * W4-B.5 (kanban t_87e672ec) — Screen-reader announcements for scene transitions.
 *
 * The game owns a visually-hidden aria-live="assertive" region
 * (#sr-announcer, owned by AccessibilitySystem in src/systems/Accessibility.ts)
 * so screen readers announce every scene transition:
 *   - "Menu" on entering the menu scene
 *   - "Game started" on entering the game scene
 *   - "Game over, final score: X" on entering the game-over scene
 *     (X from the transition data payload, falling back to the stored
 *      high score, falling back to 0)
 *
 * These tests exercise AccessibilitySystem DIRECTLY (unit level — no WebGL,
 * no scene construction). SceneManager/Game wiring (who calls
 * announceSceneTransition on transition) is verified by the full suite +
 * the in-browser evidence (W4B5-VERIFY.txt).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AccessibilitySystem,
  SR_ANNOUNCER_ID,
} from "@/systems/Accessibility";
import { HIGH_SCORE_KEY } from "@/systems/Score";

// --- Tests --------------------------------------------------------------------

describe("W4-B.5: AccessibilitySystem — scene-transition announcements", () => {
  let system: AccessibilitySystem;

  beforeEach(() => {
    document.body.innerHTML = "";
    window.localStorage.clear();
    system = new AccessibilitySystem();
  });

  afterEach(() => {
    system.cleanup();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  // --- Region creation ----------------------------------------------------

  it("creates a visually-hidden aria-live=assertive region in document.body", () => {
    const el = document.getElementById(SR_ANNOUNCER_ID);
    expect(el).toBeTruthy();
    expect(el!.getAttribute("aria-live")).toBe("assertive");
    expect(el!.getAttribute("role")).toBe("status");
    expect(el!.getAttribute("aria-atomic")).toBe("true");
    expect(el!.parentElement).toBe(document.body);

    // Visually hidden: no rendered box, not display:none (aria-live regions
    // must stay in the accessibility tree).
    expect(el!.style.position).toBe("absolute");
    expect(el!.style.width).toBe("1px");
    expect(el!.style.height).toBe("1px");
    expect(el!.style.overflow).toBe("hidden");
    expect(el!.style.clip).toBe("rect(0px, 0px, 0px, 0px)");
    expect(el!.style.whiteSpace).toBe("nowrap");
    expect(el!.style.display).toBe("");
  });

  it("is idempotent — a second instance reuses the existing region", () => {
    const firstEl = document.getElementById(SR_ANNOUNCER_ID)!;
    const second = new AccessibilitySystem();
    expect(document.getElementById(SR_ANNOUNCER_ID)).toBe(firstEl);
    expect(document.querySelectorAll(`#${SR_ANNOUNCER_ID}`).length).toBe(1);
    second.cleanup();
  });

  // --- announceSceneTransition ----------------------------------------------

  it('announces "Menu" when the menu scene is entered', () => {
    system.announceSceneTransition("menu");
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Menu"
    );
  });

  it('announces "Game started" when the game scene is entered', () => {
    system.announceSceneTransition("game");
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Game started"
    );
  });

  it("announces the final score from transition data on game over", () => {
    system.announceSceneTransition("gameover", { score: 150, highScore: 200 });
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Game over, final score: 150"
    );
  });

  it("falls back to the stored high score when data.score is missing", () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "42");
    system.announceSceneTransition("gameover", {});
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Game over, final score: 42"
    );
  });

  it("falls back to 0 when storage is absent", () => {
    system.announceSceneTransition("gameover");
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Game over, final score: 0"
    );
  });

  it("falls back to 0 when the stored score is corrupt", () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "not-a-number");
    system.announceSceneTransition("gameover");
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Game over, final score: 0"
    );
  });

  it("stays silent for the boot scene", () => {
    system.announceSceneTransition("boot");
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe("");
  });

  it('announces "Scene: <name>" for unknown scene names', () => {
    system.announceSceneTransition("boss-level");
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Scene: boss-level"
    );
  });

  it("replaces the previous announcement on each transition", () => {
    system.announceSceneTransition("menu");
    system.announceSceneTransition("game");
    system.announceSceneTransition("gameover", { score: 7 });
    const el = document.getElementById(SR_ANNOUNCER_ID)!;
    expect(el.textContent).toBe("Game over, final score: 7");
    // Only one region ever exists.
    expect(document.querySelectorAll(`#${SR_ANNOUNCER_ID}`).length).toBe(1);
  });

  // --- announce() semantics -------------------------------------------------

  it("announce() updates the region text", () => {
    system.announce("Custom message");
    expect(document.getElementById(SR_ANNOUNCER_ID)!.textContent).toBe(
      "Custom message"
    );
  });

  it("announce() re-announces identical text (assertive semantics)", async () => {
    const el = document.getElementById(SR_ANNOUNCER_ID)!;
    system.announce("Same");
    expect(el.textContent).toBe("Same");

    // Assertive live regions do not re-announce unchanged text — the system
    // clears first, then re-sets on the next tick.
    system.announce("Same");
    await new Promise((r) => setTimeout(r, 20));
    expect(el.textContent).toBe("Same");
  });

  it("announce() after cleanup is a safe no-op", () => {
    system.cleanup();
    expect(() => system.announce("late")).not.toThrow();
    expect(document.getElementById(SR_ANNOUNCER_ID)).toBeNull();
  });

  // --- cleanup ----------------------------------------------------------------

  it("cleanup() removes the region from the DOM", () => {
    expect(document.getElementById(SR_ANNOUNCER_ID)).toBeTruthy();
    system.cleanup();
    expect(document.getElementById(SR_ANNOUNCER_ID)).toBeNull();
  });

  it("cleanup() is idempotent", () => {
    system.cleanup();
    expect(() => system.cleanup()).not.toThrow();
    expect(document.getElementById(SR_ANNOUNCER_ID)).toBeNull();
  });
});
