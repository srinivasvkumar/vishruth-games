# W3-C.2 Findings

## Root Cause Analysis (from code inspection, main @ 7b73e1c)

### Audio.ts constructor (line 124)
`this.context = this.createContext()` — creates `new AudioContext()` immediately
at construction. Called from Game.ts:54. No user gesture yet.

### Game.ts start() (line 128)
`void this.audioSystem.init().then(() => { this.audioSystem.startMusic(); });`
`init()` calls `this.context.resume()` — second AudioContext op without gesture.

### Firefox evidence (tests/evidence/w2/w2-e1a-smoke-console-firefox.txt L19-20)
2x "[JavaScript Warning: An AudioContext was prevented from starting
automatically. It must be created or resumed after a user gesture on the page."
{file: "http://localhost:5173/src/systems/Audio.ts" line: 62 / line: 77}

### Unit test impact
- audio-system.test.ts L64: "constructs an AudioContext... on construction" — will FAIL
- audio-system.test.ts L199: "constructor applies config volumes" — will FAIL
- MockAudioContext needs userGesture awareness
