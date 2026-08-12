// Game configuration
export const GameConfig = {
    // Canvas dimensions
    width: 1280,
    height: 720,
    
    // Physics configuration
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    
    // Game settings
    settings: {
        playerSpeed: 350,
        jumpForce: -550,
        shipSpeed: 250,
        scrollSpeed: 350,
        groundY: 600
    },
    
    // Color palette
    colors: {
        backgroundTop: '#0a0a2e',
        backgroundBottom: '#1a1a5e',
        playerCube: '#00ffff',
        playerShip: '#00ff00',
        playerBall: '#ffaa00',
        playerUfo: '#aa00ff',
        obstacle: '#ff3333',
        text: '#ffffff'
    },
    
    // File paths
    paths: {
        assets: 'assets',
        levels: 'assets/levels',
        audio: 'assets/audio',
        sprites: 'assets/sprites'
    }
};
