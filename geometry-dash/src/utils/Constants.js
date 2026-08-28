// Game constants
export const Constants = {
  // Player settings
  PLAYER_SPEED: 300,
  JUMP_FORCE: -550,
  GRAVITY: 1000,
  
  // Game modes
  MODES: {
    CUBE: 'cube',
    SHIP: 'ship',
    BALL: 'ball',
    UFO: 'ufo',
    WAVE: 'wave',
    SPIDER: 'spider',
    ROBOT: 'robot',
    FLUX: 'flux',
  },
  
  // Sprite keys
  SPRITES: {
    PLAYER_CUBE: 'player_cube',
    PLAYER_SHIP: 'player_ship',
    PLAYER_BALL: 'player_ball',
    PLAYER_UFO: 'player_ufo',
    PLAYER_WAVE: 'player_wave',
    PLAYER_SPIDER: 'player_spider',
    PLAYER_ROBOT: 'player_robot',
    PLAYER_FLUX: 'player_flux',
    SPIKE: 'spike',
    BLOCK: 'block',
    PLATFORM: 'platform',
  },
  
  // Colors
  COLORS: {
    PRIMARY: '#667eea',
    SECONDARY: '#764ba2',
    DANGER: '#ff4757',
    SUCCESS: '#2ed573',
    WARNING: '#ffa502',
  },
  
  // Game dimensions (will be set dynamically)
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
};

export default Constants;
