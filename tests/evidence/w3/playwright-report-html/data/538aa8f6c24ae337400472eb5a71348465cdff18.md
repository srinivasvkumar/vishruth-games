# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: w4d-memory-leak.spec.ts >> W4-D.2: 5-minute memory leak test — JS heap growth over 300 s of gameplay stays <= 10 %
- Location: tests/e2e/w4d-memory-leak.spec.ts:239:1

# Error details

```
Error: Live obstacle array exceeded 60 (max 201) over the window — see /home/srinivasvkumar/vishruth/games/clusterrush/tests/evidence/w4/W4D2-MEMORY.txt

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - heading "Cluster Rush" [level=1] [ref=e4]
      - paragraph [ref=e5]: 3D Endless Runner - Built with Test-Driven Development
      - generic [ref=e8]:
        - text: "Development Status:"
        - strong [ref=e9]: Phase 1 - TDD Implementation
    - main [ref=e10]:
      - generic [ref=e13]:
        - 'heading "🔬 Current TDD Phase: Week 1 - Core Infrastructure" [level=3] [ref=e14]'
        - paragraph [ref=e15]: Following RED→GREEN→REFACTOR cycle with 80%+ test coverage target
        - generic [ref=e16]: TypeScript Strict Mode
        - generic [ref=e17]: TDD Enforced
        - generic [ref=e18]: Spec-Driven
      - generic [ref=e19]:
        - heading "🎮 Controls" [level=2] [ref=e20]
        - generic [ref=e21]:
          - generic [ref=e22]:
            - heading "Movement" [level=3] [ref=e23]
            - paragraph [ref=e24]:
              - generic [ref=e25]: W
              - text: Move Forward
            - paragraph [ref=e26]:
              - generic [ref=e27]: S
              - text: Move Backward
            - paragraph [ref=e28]:
              - generic [ref=e29]: A
              - text: Move Left
            - paragraph [ref=e30]:
              - generic [ref=e31]: D
              - text: Move Right
          - generic [ref=e32]:
            - heading "Actions" [level=3] [ref=e33]
            - paragraph [ref=e34]:
              - generic [ref=e35]: SPACE
              - text: Jump
            - paragraph [ref=e36]:
              - generic [ref=e37]: ESC
              - text: Pause Menu
            - paragraph [ref=e38]:
              - generic [ref=e39]: R
              - text: Restart
          - generic [ref=e40]:
            - heading "Camera" [level=3] [ref=e41]
            - paragraph [ref=e42]:
              - generic [ref=e43]: Q
              - text: /
              - generic [ref=e44]: E
              - text: Rotate
            - paragraph [ref=e45]:
              - generic [ref=e46]: Scroll
              - text: Zoom
            - paragraph [ref=e47]:
              - generic [ref=e48]: F
              - text: First/Third Person
      - generic [ref=e49]:
        - heading "🧪 Development Methodology" [level=2] [ref=e50]
        - paragraph [ref=e51]:
          - text: This game is being built using
          - strong [ref=e52]: Spec-Driven Development
          - text: and
          - strong [ref=e53]: Test-Driven Development
          - text: ":"
        - heading "📋 Specification First" [level=3] [ref=e54]
        - list [ref=e55]:
          - listitem [ref=e56]: Complete spec document with user stories
          - listitem [ref=e57]: Clear acceptance criteria and success metrics
          - listitem [ref=e58]: Technical architecture defined before coding
        - heading "🔬 Test-Driven Development" [level=3] [ref=e59]
        - list [ref=e60]:
          - listitem [ref=e61]: "RED: Write failing test first for each feature"
          - listitem [ref=e62]: "GREEN: Implement minimal code to pass test"
          - listitem [ref=e63]: "REFACTOR: Clean up while maintaining passing tests"
          - listitem [ref=e64]: "Target: 90%+ test coverage"
        - heading "🚀 Modern Tech Stack" [level=3] [ref=e65]
        - list [ref=e66]:
          - listitem [ref=e67]: Three.js for 3D rendering
          - listitem [ref=e68]: TypeScript with strict mode
          - listitem [ref=e69]: Vite for fast builds and HMR
          - listitem [ref=e70]: Vitest for testing (optimized for ESM)
    - contentinfo [ref=e71]:
      - paragraph [ref=e72]: Cluster Rush - Building with quality, testing with rigor
      - paragraph [ref=e73]: Development started September 7, 2026 | TDD + Spec-Driven approach
      - paragraph [ref=e74]:
        - text: See
        - code [ref=e75]: SPEC_DRIVEN_DEVELOPMENT.md
        - text: and
        - code [ref=e76]: TDD_PLAN.md
        - text: for detailed documentation
  - status [ref=e77]: Menu
  - generic [ref=e79]:
    - heading "CLUSTER RUSH" [level=1] [ref=e80]
    - paragraph [ref=e81]: Press START to begin
    - button "Start game" [ref=e82] [cursor=pointer]: START
    - button "Open settings" [ref=e83] [cursor=pointer]: SETTINGS
    - region "View high scores" [ref=e84]:
      - generic [ref=e85]: HIGH SCORE
      - generic [ref=e86]: "500"
```

# Test source

```ts
  480 |   let env = -Infinity;
  481 |   const envelope = inWindow.map((s) => {
  482 |     env = Math.max(env, s.heapUsedMB!);
  483 |     return { t: s.t, v: env };
  484 |   });
  485 |   const startHeap = envelope[0].v;
  486 |   const endHeap = envelope[envelope.length - 1].v;
  487 |   const growthPct = ((endHeap - startHeap) / startHeap) * 100;
  488 | 
  489 |   // Per-minute step growth (envelope) — a single anomalous spike is noted;
  490 |   // the gate is on start->end.
  491 |   const stepLines: string[] = [];
  492 |   for (let i = 1; i < envelope.length; i++) {
  493 |     const d = envelope[i].v - envelope[i - 1].v;
  494 |     stepLines.push(`  t=${envelope[i - 1].t}s->${envelope[i].t}s: ${d >= 0 ? '+' : ''}${d.toFixed(2)}MB`);
  495 |   }
  496 | 
  497 |   // Obstacle trend: live array must stay bounded (reap at z < -250, W4-B.11).
  498 |   const obsSeries = inWindow
  499 |     .filter((s) => typeof s.obstacles === 'number')
  500 |     .map((s) => ({ t: s.t, obs: s.obstacles!, pool: s.pool ?? -1, scene: s.sceneChildren ?? -1 }));
  501 |   const obsMax = obsSeries.length ? Math.max(...obsSeries.map((p) => p.obs)) : null;
  502 |   const obsBounded = obsMax != null && obsMax <= 60; // far above any on-screen count; a real leak runs into the hundreds
  503 | 
  504 |   // ── Verdict ─────────────────────────────────────────────────────────────
  505 |   const passHeap = growthPct <= LEAK_GROWTH_GATE * 100;
  506 |   const passObstacles = obsBounded;
  507 |   const verdict = passHeap && passObstacles && fatal.length === 0 ? 'PASS' : 'FAIL';
  508 | 
  509 |   // ── Evidence file ───────────────────────────────────────────────────────
  510 |   const nowIso = new Date().toISOString();
  511 |   const evidence: string[] = [];
  512 |   evidence.push('# W4-D.2 — 5-minute memory leak test');
  513 |   evidence.push(`# Verdict: ${verdict}`);
  514 |   evidence.push(`# Run: ${nowIso} · project=${tag} · repo @ HEAD`);
  515 |   evidence.push(`# Method: headed Chrome (chromium-boot, SwiftShader WebGL), 300 s continuous gameplay`);
  516 |   evidence.push(`#   window, heap sampled every 10 s (performance.memory), in-page watch-dog kept the`);
  517 |   evidence.push(`#   run alive; keyboard input cycled WASD+arrows every 15 s; score events`);
  518 |   evidence.push(`#   every 30 s. Gate: envelope growth (start->end, GC dips excluded) <= 10 %.`);
  519 |   evidence.push('');
  520 |   evidence.push('## Heap samples (in-window, every 10 s)');
  521 |   evidence.push('t(s)  heapUsedMB  heapTotalMB  obstacles  pool  sceneChildren  domNodes  frames  playing');
  522 |   for (const s of inWindow) {
  523 |     evidence.push(
  524 |       `${String(s.t).padStart(5, ' ')}  ${String(s.heapUsedMB ?? 'n/a').padStart(10, ' ')}  ${String(s.heapTotalMB ?? 'n/a').padStart(12, ' ')}  ${String(s.obstacles ?? 'n/a').padStart(9, ' ')}  ${String(s.pool ?? 'n/a').padStart(4, ' ')}  ${String(s.sceneChildren ?? 'n/a').padStart(14, ' ')}  ${String(s.domNodes ?? 'n/a').padStart(8, ' ')}  ${String(s.frames ?? 'n/a').padStart(6, ' ')}  ${String(s.playing ?? 'n/a')}`
  525 |     );
  526 |   }
  527 |   evidence.push('');
  528 |   evidence.push('## Checkpoints (screenshot + console at each minute)');
  529 |   for (const c of checkpoints) {
  530 |     evidence.push(
  531 |       `T${c.minute}MIN: heap=${c.heapUsedMB}MB total=${c.heapTotalMB}MB obs=${c.obstacles} pool=${c.pool} ` +
  532 |         `scene=${c.sceneChildren} dom=${c.domNodes} playing=${c.playing} shot=${c.shot}`
  533 |     );
  534 |   }
  535 |   evidence.push('');
  536 |   evidence.push('## Analysis');
  537 |   evidence.push(`Monotone envelope (GC dips excluded): start=${startHeap}MB end=${endHeap}MB growth=${growthPct.toFixed(2)}% (gate: <= ${LEAK_GROWTH_GATE * 100}%)`);
  538 |   evidence.push('Step deltas (envelope):');
  539 |   evidence.push(...stepLines);
  540 |   evidence.push(`Live obstacle array: max=${obsMax} over window (bounded <= 60: ${obsBounded ? 'YES' : 'NO'})`);
  541 |   evidence.push(`Fatal console errors in full run: ${fatal.length}`);
  542 |   if (fatal.length) {
  543 |     evidence.push(...fatal.slice(0, 20).map((e) => `  [${e.type} @t${e.t}s] ${e.text.slice(0, 300)}`));
  544 |   }
  545 |   evidence.push('');
  546 |   evidence.push('## Transition phase (after 5 min, secondary — not gating)');
  547 |   evidence.push(`game-over heap=${goHeap}MB; menu-after-run1=${menuHeap}MB; run2-end(30s)=${run2Heap}MB; menu-after-run2=${menu2Heap}MB`);
  548 |   evidence.push('');
  549 |   evidence.push(`## VERDICT: ${verdict}`);
  550 |   evidence.push(
  551 |     passHeap
  552 |       ? `  heap growth ${growthPct.toFixed(2)}% <= ${LEAK_GROWTH_GATE * 100}% gate over 300 s continuous gameplay.`
  553 |       : `  heap growth ${growthPct.toFixed(2)}% EXCEEDS the ${LEAK_GROWTH_GATE * 100} % gate — flagged as a leak.`
  554 |   );
  555 |   evidence.push(
  556 |     passObstacles
  557 |       ? `  obstacle array stayed bounded (max ${obsMax}) — W4-B.11 reap/pool working.`
  558 |       : `  obstacle array UNBOUNDED (max ${obsMax}) — reap/pool not bounding the live array.`
  559 |   );
  560 |   evidence.push(
  561 |     fatal.length === 0 ? '  no fatal console errors across the full run.' : `  ${fatal.length} fatal console errors — see list above.`
  562 |   );
  563 |   evidence.push('');
  564 |   evidence.push('## Screenshots');
  565 |   evidence.push('  w4d2-mem-t0min.png .. w4d2-mem-t5min.png (per-minute checkpoints)');
  566 |   evidence.push('  w4d2-mem-gameover.png, w4d2-mem-run2.png, w4d2-mem-menu2.png (transition phase)');
  567 | 
  568 |   writeFileSync(EVIDENCE_FILE, evidence.join('\n') + '\n', 'utf8');
  569 |   log(`evidence written: ${EVIDENCE_FILE}`);
  570 | 
  571 |   // The spec's own assert = the gate, so a CI run fails exactly when the
  572 |   // gate fails (evidence file always written first).
  573 |   expect(
  574 |     passHeap,
  575 |     `JS heap grew ${growthPct.toFixed(2)}% over 300 s (envelope ${startHeap}MB -> ${endHeap}MB); gate is ${LEAK_GROWTH_GATE * 100}% — see ${EVIDENCE_FILE}`
  576 |   ).toBe(true);
  577 |   expect(
  578 |     passObstacles,
  579 |     `Live obstacle array exceeded 60 (max ${obsMax}) over the window — see ${EVIDENCE_FILE}`
> 580 |   ).toBe(true);
      |     ^ Error: Live obstacle array exceeded 60 (max 201) over the window — see /home/srinivasvkumar/vishruth/games/clusterrush/tests/evidence/w4/W4D2-MEMORY.txt
  581 |   expect(
  582 |     fatal.length,
  583 |     `Fatal console errors observed: ${fatal.map((e) => `[${e.type}] ${e.text}`).join(' | ')}`
  584 |   ).toBe(0);
  585 | });
  586 | 
```