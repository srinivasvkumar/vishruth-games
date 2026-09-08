/**
 * Game-wide constants
 */
export const GameConstants = {
  // Physics
  GRAVITY: 9.81,
  TERMINAL_VELOCITY: 20,
  FRICTION: 0.98,
  
  // Player
  PLAYER_SPEED: 5.0,
  JUMP_FORCE: 10.0,
  MAX_JUMP_VELOCITY: 15.0,
  PLAYER_HEALTH: 100,
  PLAYER_LIVES: 3,
  
  // Game
  SCORE_MULTIPLIER: 100,
  MAX_LEVEL: 10,
  OBSTACLE_SPAWN_RATE: 1.5,
  ITEM_SPAWN_RATE: 2.0,
  LEVEL_TIME_LIMIT: 180, // seconds
  
  // UI
  FPS_TARGET: 60,
  UI_UPDATE_INTERVAL: 100, // milliseconds
  NOTIFICATION_DURATION: 3000, // milliseconds
  
  // Audio
  AUDIO_FADE_DURATION: 1000, // milliseconds
  VOLUME_INCREMENT: 0.1,
  
  // Input
  INPUT_DEBOUNCE: 50, // milliseconds
  INPUT_REPEAT_DELAY: 300, // milliseconds
  GAMEPAD_DEADZONE: 0.15,
  
  // Networking (if applicable)
  MAX_PING: 500, // milliseconds
  RECONNECT_ATTEMPTS: 3,
  HEARTBEAT_INTERVAL: 5000, // milliseconds
} as const;

/**
 * Input key mappings
 */
export const InputConstants = {
  KEY_W: 'w',
  KEY_A: 'a',
  KEY_S: 's',
  KEY_D: 'd',
  KEY_SPACE: ' ',
  KEY_ENTER: 'Enter',
  KEY_ESCAPE: 'Escape',
  KEY_SHIFT: 'Shift',
  KEY_CTRL: 'Control',
  KEY_ALT: 'Alt',
  KEY_TAB: 'Tab',
  
  // Gamepad
  GAMEPAD_A: 0,
  GAMEPAD_B: 1,
  GAMEPAD_X: 2,
  GAMEPAD_Y: 3,
  GAMEPAD_LB: 4,
  GAMEPAD_RB: 5,
  GAMEPAD_LT: 6,
  GAMEPAD_RT: 7,
  GAMEPAD_SELECT: 8,
  GAMEPAD_START: 9,
  GAMEPAD_LS: 10,
  GAMEPAD_RS: 11,
  GAMEPAD_UP: 12,
  GAMEPAD_DOWN: 13,
  GAMEPAD_LEFT: 14,
  GAMEPAD_RIGHT: 15,
  
  // Mouse
  MOUSE_LEFT: 0,
  MOUSE_MIDDLE: 1,
  MOUSE_RIGHT: 2,
} as const;

/**
 * Collision layers
 */
export const CollisionLayers = {
  PLAYER: 1,
  OBSTACLE: 2,
  ITEM: 4,
  GROUND: 8,
  TRIGGER: 16,
  ALL: 31,
} as const;

/**
 * Event names
 */
export const GameEvents = {
  // Game events
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_STOP: 'game:stop',
  GAME_OVER: 'game:over',
  LEVEL_START: 'level:start',
  LEVEL_COMPLETE: 'level:complete',
  LEVEL_FAILED: 'level:failed',
  
  // Player events
  PLAYER_MOVE: 'player:move',
  PLAYER_JUMP: 'player:jump',
  PLAYER_COLLIDE: 'player:collide',
  PLAYER_DAMAGE: 'player:damage',
  PLAYER_HEAL: 'player:heal',
  PLAYER_DEATH: 'player:death',
  PLAYER_SCORE: 'player:score',
  PLAYER_POWERUP: 'player:powerup',
  
  // UI events
  UI_MENU_OPEN: 'ui:menu:open',
  UI_MENU_CLOSE: 'ui:menu:close',
  UI_SCORE_UPDATE: 'ui:score:update',
  UI_HEALTH_UPDATE: 'ui:health:update',
  UI_NOTIFICATION: 'ui:notification',
  
  // Audio events
  AUDIO_PLAY: 'audio:play',
  AUDIO_STOP: 'audio:stop',
  AUDIO_VOLUME_CHANGE: 'audio:volume:change',
  AUDIO_MUTE: 'audio:mute',
  
  // Network events (if applicable)
  NETWORK_CONNECT: 'network:connect',
  NETWORK_DISCONNECT: 'network:disconnect',
  NETWORK_ERROR: 'network:error',
} as const;
