import { Game } from '@/core/Game';
import { GameConstants } from '@/utils/Constants';
import { Logger } from '@/utils/Logger';
import type { GameConfig } from '@/types/GameTypes';

/**
 * Default game configuration
 */
const defaultConfig: GameConfig = {
  physics: {
    gravity: GameConstants.GRAVITY,
    worldScale: 1,
    fixedTimeStep: 1 / 60,
    maxSubSteps: 3
  },
  audio: {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.7,
    spatialAudio: true
  },
  ui: {
    theme: 'dark',
    fontSize: 14,
    showFPS: true,
    showDebug: false
  },
  debug: {
    showColliders: false,
    showStats: false,
    logPhysics: false,
    logPerformance: false
  }
};

/**
 * Initialize the game
 */
function initGame(): void {
  Logger.info('Initializing Cluster Rush...');
  
  try {
    // Create game instance with configuration
    const game = new Game(defaultConfig);
    
    // Store reference globally for debugging
    (window as any).game = game;
    
    // Start the game
    game.start();
    
    Logger.info('Game started successfully');
    
    // Handle window events
    setupWindowEvents(game);
    
  } catch (error) {
    Logger.error('Failed to initialize game', error);
    showErrorScreen(error as Error);
  }
}

/**
 * Set up window event listeners
 */
function setupWindowEvents(game: Game): void {
  // Handle resize
  window.addEventListener('resize', () => {
    Logger.debug('Window resized');
  });
  
  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.isGameRunning()) {
      game.pause();
      Logger.info('Game paused due to tab change');
    }
  });
  
  // Handle beforeunload
  window.addEventListener('beforeunload', () => {
    game.stop();
    Logger.info('Game stopped due to page unload');
  });
}

/**
 * Show error screen on initialization failure
 */
function showErrorScreen(error: Error): void {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #1a1a1a;
    color: #ff4444;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    padding: 20px;
    z-index: 9999;
  \`;
  
  errorDiv.innerHTML = \`
    <h1>🚨 Game Initialization Failed</h1>
    <p>\${error.message}</p>
    <pre>\${error.stack}</pre>
    <button onclick="location.reload()" style="
      background: #ff4444;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 20px;
    ">Retry</button>
  \`;
  
  document.body.appendChild(errorDiv);
}

/**
 * Bootstrap the application
 */
function bootstrap(): void {
  // Set logging level based on URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug') === 'true';
  
  if (debugMode) {
    Logger.setLevel('debug');
    Logger.info('Debug mode enabled');
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
}

// Start the application
bootstrap();
