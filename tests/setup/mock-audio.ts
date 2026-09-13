/**
 * WebAudio mock for AudioSystem unit tests (W2-C.1, Task 6.5.1).
 *
 * happy-dom does NOT implement WebAudio — `window.AudioContext` and
 * `window.webkitAudioContext` are both undefined (verified 2026-09-13,
 * happy-dom 20.14.0: no "AudioContext" string anywhere in its lib/).
 * This setup file installs a deterministic in-memory stand-in for the
 * AudioContext + node graph surface Audio.ts (W2-C.1) uses, so the
 * audio pipeline can be asserted without real audio hardware.
 *
 * Installed via globalThis assignment BEFORE the AudioSystem module is
 * imported (the constructor reads `window.AudioContext ??
 * window.webkitAudioContext` at construction time, not import time —
 * see audio-system.test.ts).
 *
 * Surface (matches the WebAudio API Audio.ts consumes):
 *   MockAudioContext
 *     state: 'suspended' (auto 'running' after resume() resolves)
 *     currentTime: 0 (advanceClock() drives it)
 *     resume(): Promise<void> (resolves, flips state)
 *     close(): Promise<void> (resolves, flips state)
 *     createGain() -> GainNode { gain: {value, setValueAtTime}, connect, disconnect }
 *     createOscillator() -> OscillatorNode { type, frequency: {value, setValueAtTime}, connect, start, stop, disconnect }
 *     createBufferSource() -> AudioBufferSourceNode { buffer, connect, start, stop, disconnect }
 *     createBuffer(channels, length, sampleRate) -> AudioBuffer {
 *         getChannelData(i) -> Float32Array (zero-filled; read back in tests),
 *         numberOfChannels, length, sampleRate }
 *     destination (sink node)
 *   window.AudioContext = window.webkitAudioContext = MockAudioContext
 *
 * Global counters let tests count node creation: `nodes.oscillators`,
 * `nodes.bufferSources`, `nodes.gains`.
 *
 * Node-identity convention (used by routing assertions in tests):
 *   `connect(target)` records `this.target = target` on the SOURCE node,
 *   so `osc.target` / `gain.target` / `source.target` give the direct
 *   routing without scanning a shared `connectedTo` list.
 */

/** Record of every node created during the test's lifetime. */
export interface AudioMockNodes {
  gains: Array<Record<string, unknown>>;
  oscillators: Array<Record<string, unknown>>;
  bufferSources: Array<Record<string, unknown>>;
  buffers: Array<Float32Array>;
}

function makeParam(initial: number): Record<string, unknown> {
  return {
    value: initial,
    setValueAtTime(v: number, _time: number): void {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number, _time: number): void {
      this.value = v;
    }
  };
}

function makeGainNode(): Record<string, unknown> {
  return {
    gain: makeParam(1),
    target: null as unknown,
    connect(destination: unknown): unknown {
      this.target = destination;
      return destination;
    },
    disconnect(): void {
      this.target = null;
    }
  };
}

function makeOscillatorNode(): Record<string, unknown> {
  return {
    type: 'sine',
    frequency: makeParam(440),
    started: false,
    stopped: false,
    stopTime: null as number | null,
    target: null as unknown,
    connect(destination: unknown): unknown {
      this.target = destination;
      return destination;
    },
    start(): void {
      this.started = true;
    },
    stop(time: number): void {
      this.stopped = true;
      this.stopTime = time;
    },
    disconnect(): void {
      this.target = null;
    }
  };
}

function makeBufferSourceNode(): Record<string, unknown> {
  return {
    buffer: null as unknown,
    started: false,
    stopped: false,
    stopTime: null as number | null,
    loop: false,
    target: null as unknown,
    connect(destination: unknown): unknown {
      this.target = destination;
      return destination;
    },
    start(): void {
      this.started = true;
    },
    stop(time: number): void {
      this.stopped = true;
      this.stopTime = time;
    },
    disconnect(): void {
      this.target = null;
    }
  };
}

export class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  destination: Record<string, unknown> = {};
  readonly nodes: AudioMockNodes = {
    gains: [],
    oscillators: [],
    bufferSources: [],
    buffers: []
  };
  private clock = 0;

  createGain(): Record<string, unknown> {
    const node = makeGainNode();
    this.nodes.gains.push(node);
    return node;
  }

  createOscillator(): Record<string, unknown> {
    const node = makeOscillatorNode();
    this.nodes.oscillators.push(node);
    return node;
  }

  createBufferSource(): Record<string, unknown> {
    const node = makeBufferSourceNode();
    this.nodes.bufferSources.push(node);
    return node;
  }

  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ): Record<string, unknown> {
    const channelData = new Float32Array(length);
    this.nodes.buffers.push(channelData);
    return {
      numberOfChannels,
      length,
      sampleRate,
      getChannelData(channel: number): Float32Array {
        if (channel < 0 || channel >= numberOfChannels) {
          throw new RangeError('invalid channel index');
        }
        return channelData;
      }
    };
  }

  resume(): Promise<void> {
    if (this.state === 'suspended') {
      this.state = 'running';
    }
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }

  /** Test helper: advance the mock clock by `seconds`. */
  advanceClock(seconds: number): void {
    this.clock += seconds;
    this.currentTime = this.clock;
  }
}

/**
 * Install the mock AudioContext on `window`/`globalThis` (both
 * AudioContext and webkitAudioContext). Returns the class so tests can
 * build a throwing constructor (load-failure path) by re-installing.
 */
export function installMockAudioContext(): typeof MockAudioContext {
  installAudioContextGlobal(MockAudioContext);
  return MockAudioContext;
}

/** Remove the mock AudioContext globals (load-failure test). */
export function removeMockAudioContext(): void {
  installAudioContextGlobal(undefined);
}

// globalThis assignment (rather than vi.stubGlobal) keeps this module
// importable from setup files where `vi` is not in scope; vitest's
// happy-dom environment aliases window === globalThis.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function installAudioContextGlobal(value: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;
  if (value === undefined) {
    delete g.AudioContext;
    delete g.webkitAudioContext;
  } else {
    g.AudioContext = value;
    g.webkitAudioContext = value;
  }
}
