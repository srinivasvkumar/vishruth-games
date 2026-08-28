import Phaser from 'phaser';
import { Constants } from '../utils/Constants.js';
import { Player } from '../entities/Player.js';
import { Obstacle } from '../entities/Obstacle.js';

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('🎮 GameScene create() called');

    try {
      // Get ACTUAL game dimensions (not camera dimensions)
      this.gameWidth = this.scale.width;
      this.gameHeight = this.scale.height;
      console.log('📐 Game dimensions:', this.gameWidth, 'x', this.gameHeight);
      console.log('📐 Scale config:', this.scale);
      console.log('📐 Camera dimensions:', this.cameras.main.width, 'x', this.cameras.main.height);

      // TEMPORARY: Use fixed dimensions for testing if scale dimensions are 0 or too small
      if (this.gameWidth < 100 || this.gameHeight < 100) {
        console.warn('⚠️ Game dimensions too small, using fixed dimensions for testing');
        this.gameWidth = 1920;
        this.gameHeight = 1080;
        console.log('📐 Using fixed dimensions:', this.gameWidth, 'x', this.gameHeight);
      }

      // Game state
      this.score = 0;
      this.isPlaying = true;
      this.currentMode = Constants.MODES.CUBE;

      // Create DOM UI elements
      this.createScoreDisplay();
      console.log('✓ Score display created');

      // Create ground platform
      this.createGround();
      console.log('✓ Ground created');

      // Create player ON the ground (not above it)
      const groundHeight = 100;
      const groundY = this.gameHeight - groundHeight / 2;
      const playerY = groundY - 16; // Player sits on top of ground (half player height)
      console.log('🎯 Creating player at:', 100, playerY, '(groundY:', groundY, ')');
      this.player = new Player(this, 100, playerY, Constants.MODES.CUBE);
      console.log('✓ Player created at:', this.player.x, this.player.y, '(groundY:', groundY, ')');

      // Create obstacles
      this.obstacles = this.physics.add.group();
      this.createObstaclePattern();
      console.log('✓ Obstacles created');

      // Collision detection
      this.physics.add.collider(this.player.sprite, this.obstacles, this.handleObstacleCollision, null, this);
      this.physics.add.collider(this.player.sprite, this.ground, this.handleGroundCollision, null, this);
      console.log('✓ Collision detection set up');

      // Input handling
      this.input.on('pointerdown', this.handleInput, this);
      this.input.on('pointerup', this.stopJump, this);
      console.log('✓ Input handlers registered');

      // Score timer
      this.scoreTimer = this.time.addEvent({
        delay: 100,
        callback: this.incrementScore,
        callbackScope: this,
        loop: true,
      });
      console.log('✓ Score timer started');

      console.log('✅ GameScene setup complete');
    } catch (error) {
      console.error('❌ Error in GameScene create():', error);
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  createScoreDisplay() {
    // Check if score display already exists
    let scoreDiv = document.getElementById('score-display');
    if (!scoreDiv) {
      scoreDiv = document.createElement('div');
      scoreDiv.className = 'score-display';
      scoreDiv.id = 'score-display';
      scoreDiv.textContent = 'Score: 0';
      document.body.appendChild(scoreDiv);
      console.log('  → Score display DOM element created');
    }
    this.scoreDisplay = scoreDiv;
  }

  createGround() {
    const groundHeight = 100;
    const groundY = this.gameHeight - groundHeight / 2;

    console.log(`  → Creating ground at Y=${groundY}, height=${groundHeight}`);

    // Create ground platform
    this.ground = this.physics.add.staticGroup();

    // Create a long ground platform
    const groundWidth = this.gameWidth + 200;
    const ground = this.add.rectangle(
      this.gameWidth / 2,  // Center horizontally
      groundY,
      groundWidth,
      groundHeight,
      0x34495e
    );
    
    this.physics.add.existing(ground, true);
    this.ground.add(ground);
    console.log(`  → Ground rectangle created (${groundWidth}x${groundHeight}) at Y=${groundY}`);
  }

  createObstaclePattern() {
    // Create initial obstacles
    const spawnX = this.gameWidth + 100;
    this.spawnObstacle(spawnX, this.gameHeight - 150);
    console.log(`  → Initial obstacle spawned at X=${spawnX}`);

    // Schedule more obstacles
    this.obstacleSpawner = this.time.addEvent({
      delay: 2000,
      callback: this.spawnNextObstacle,
      callbackScope: this,
      loop: true,
    });
    console.log('  → Obstacle spawner scheduled (every 2s)');
  }

  spawnObstacle(x, y) {
    const obstacle = new Obstacle(this, x, y, 'spike');
    this.obstacles.add(obstacle.sprite);
    console.log(`  → Obstacle spawned at (${x}, ${y})`);
  }

  spawnNextObstacle() {
    if (!this.isPlaying) return;

    const x = this.gameWidth + 100;
    const y = this.gameHeight - 150;

    // Randomize obstacle type and position slightly
    const randomY = y + Phaser.Math.Between(-50, 50);
    this.spawnObstacle(x, randomY);
  }

  handleInput() {
    if (!this.isPlaying) {
      console.log('⚠ Input ignored - game not playing');
      return;
    }
    console.log('👆 Jump input detected');
    this.player.jump();
  }

  stopJump() {
    this.player.stopJump();
  }

  handleObstacleCollision(player, obstacle) {
    if (!this.isPlaying) return;

    // Game over
    this.isPlaying = false;
    this.scoreTimer.remove();
    this.obstacleSpawner.remove();

    console.log('💀 Game Over! Final Score:', this.score);

    // Show game over screen
    this.showGameOver();
  }

  handleGroundCollision(player, ground) {
    // Player landed safely
    player.onGround = true;
    console.log('🦶 Player landed on ground');
  }

  incrementScore() {
    if (!this.isPlaying) return;

    this.score++;
    this.scoreDisplay.textContent = `Score: ${this.score}`;
  }

  showGameOver() {
    // Remove existing game over screen if any
    const existingGameOver = document.querySelector('.game-over-overlay');
    if (existingGameOver) {
      existingGameOver.remove();
    }

    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-overlay';
    gameOverDiv.innerHTML = `
      <div class="game-over-title">GAME OVER</div>
      <div class="final-score">Score: ${this.score}</div>
      <button class="menu-button" id="restart-button">Restart</button>
    `;
    document.body.appendChild(gameOverDiv);

    // Add restart button handler
    const restartBtn = gameOverDiv.querySelector('#restart-button');
    restartBtn.addEventListener('click', () => {
      gameOverDiv.remove();
      this.scene.restart();
    });
  }

  update() {
    if (!this.isPlaying) return;

    // Update player
    this.player.update();

    // Remove obstacles that are off-screen
    this.obstacles.children.each((obstacle) => {
      if (obstacle.x < -100) {
        obstacle.destroy();
      }
    });
  }
}

export { GameScene };
