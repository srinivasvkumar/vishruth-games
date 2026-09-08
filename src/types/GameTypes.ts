import type { Vector3 } from 'three';

/**
 * Game configuration interface
 */
export interface GameConfig {
  physics: PhysicsConfig;
  audio: AudioConfig;
  ui: UIConfig;
  debug: DebugConfig;
}

/**
 * Physics configuration
 */
export interface PhysicsConfig {
  gravity: number;
  worldScale: number;
  fixedTimeStep: number;
  maxSubSteps: number;
}

/**
 * Audio configuration
 */
export interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  spatialAudio: boolean;
}

/**
 * UI configuration
 */
export interface UIConfig {
  theme: 'light' | 'dark';
  fontSize: number;
  showFPS: boolean;
  showDebug: boolean;
}

/**
 * Debug configuration
 */
export interface DebugConfig {
  showColliders: boolean;
  showStats: boolean;
  logPhysics: boolean;
  logPerformance: boolean;
}

/**
 * Base entity interface
 */
export interface Entity {
  id: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  visible: boolean;
  active: boolean;
}

/**
 * Player state interface
 */
export interface PlayerState {
  health: number;
  score: number;
  lives: number;
  powerUps: string[];
  isInvincible: boolean;
  isJumping: boolean;
}

/**
 * Game state interface
 */
export interface GameState {
  currentLevel: number;
  currentScore: number;
  highScore: number;
  isPaused: boolean;
  isGameOver: boolean;
  timeElapsed: number;
}

/**
 * Input state interface
 */
export interface InputState {
  keys: Record<string, boolean>;
  mouse: {
    x: number;
    y: number;
    buttons: Record<number, boolean>;
  };
  gamepad?: {
    axes: number[];
    buttons: boolean[];
  };
}
