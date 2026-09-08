import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import { GameConstants, GameEvents } from '@/utils/Constants';
import { Player } from '@/entities/Player';
import { Obstacle } from '@/entities/Obstacle';
import type { Game } from '@/core/Game';

/**
 * Main gameplay scene
 */
export class GameScene extends Scene {
  private player: Player | null = null;
  private obstacles: Obstacle[] = [];
  private score: number = 0;
  private level: number = 1;
  private isGameOver: boolean = false;
  private obstacleSpawnTimer: number = 0;
  private scoreElement: HTMLElement | null = null;
  private healthElement: HTMLElement | null = null;
  private levelElement: HTMLElement | null = null;
  
  constructor(game: Game) {
    super(game);
    this.setupUI();
    Logger.info('Game scene created');
  }
  
  /**
   * Create main game camera
   */
  protected createCamera(): THREE.Camera {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);
    return camera;
  }
  
  /**
   * Load game assets
   */
  protected async onLoad(): Promise<void> {
    Logger.info('Loading game scene assets...');
    
    // Setup scene
    this.setupScene();
    
    // Create player
    this.player = new Player(new THREE.Vector3(0, 1, 0));
    this.scene.add(this.player.getMesh());
    
    // Create initial obstacles
    this.spawnObstacles(3);
    
    // Setup lights
    this.setupLights();
    
    // Setup event listeners
    this.setupEventListeners();
    
    Logger.info('Game scene loaded');
  }
  
  /**
   * Enter game scene
   */
  protected onEnter(): void {
    if (this.scoreElement) this.scoreElement.style.display = 'block';
    if (this.healthElement) this.healthElement.style.display = 'block';
    if (this.levelElement) this.levelElement.style.display = 'block';
    
    Logger.debug('Game scene entered');
  }
  
  /**
   * Update game scene
   */
  protected onUpdate(deltaTime: number): void {
    if (this.isGameOver || !this.player || !this.player.isPlayerAlive()) return;
    
    // Update player
    const inputState = this.game.getInputSystem().getInputState();
    this.player.update(deltaTime, inputState.keys);
    
    // Update obstacles
    for (const obstacle of this.obstacles) {
      obstacle.update(deltaTime);
    }
    
    // Spawn new obstacles
    this.obstacleSpawnTimer += deltaTime;
    if (this.obstacleSpawnTimer >= GameConstants.OBSTACLE_SPAWN_RATE / this.level) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }
    
    // Check collisions
    this.checkCollisions();
    
    // Update UI
    this.updateUI();
  }
  
  /**
   * Exit game scene
   */
  protected onExit(): void {
    if (this.scoreElement) this.scoreElement.style.display = 'none';
    if (this.healthElement) this.healthElement.style.display = 'none';
    if (this.levelElement) this.levelElement.style.display = 'none';
    
    Logger.debug('Game scene exited');
  }
  
  /**
   * Clean up game scene
   */
  protected onCleanup(): void {
    this.obstacles.forEach(obstacle => {
      this.scene.remove(obstacle.getMesh());
    });
    
    if (this.player) {
      this.scene.remove(this.player.getMesh());
    }
    
    this.obstacles = [];
    this.player = null;
    
    this.removeUI();
    
    Logger.debug('Game scene cleaned up');
  }
  
  /**
   * Setup game scene
   */
  private setupScene(): void {
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.1,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    
    // Add sky
    this.scene.background = new THREE.Color(0x87CEEB);
  }
  
  /**
   * Setup lighting
   */
  private setupLights(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
    
    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x006400, 0.3);
    this.scene.add(hemisphereLight);
  }
  
  /**
   * Spawn initial obstacles
   */
  private spawnObstacles(count: number): void {
    for (let i = 0; i < count; i++) {
      const type = this.getRandomObstacleType();
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        0.5,
        -10 - i * 10
      );
      
      const obstacle = new Obstacle(position, type);
      this.scene.add(obstacle.getMesh());
      this.obstacles.push(obstacle);
    }
  }
  
  /**
   * Spawn single obstacle
   */
  private spawnObstacle(): void {
    const type = this.getRandomObstacleType();
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      0.5,
      -30
    );
    
    const obstacle = new Obstacle(position, type);
    this.scene.add(obstacle.getMesh());
    this.obstacles.push(obstacle);
    
    Logger.debug('Obstacle spawned', { type, position });
  }
  
  /**
   * Get random obstacle type
   */
  private getRandomObstacleType(): import('@/entities/Obstacle').ObstacleType {
    const types: import('@/entities/Obstacle').ObstacleType[] = [
      'block', 'spike', 'moving', 'rotating', 'breakable'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  /**
   * Check collisions
   */
  private checkCollisions(): void {
    if (!this.player) return;
    
    const playerPosition = this.player.getPosition();
    const playerRadius = 0.5;
    
    for (const obstacle of this.obstacles) {
      if (!obstacle.isObstacleActive()) continue;
      
      const obstaclePosition = obstacle.getMesh().position;
      const obstacleRadius = 0.7;
      
      const distance = playerPosition.distanceTo(obstaclePosition);
      
      if (distance < playerRadius + obstacleRadius) {
        this.handleCollision(obstacle);
      }
    }
  }
  
  /**
   * Handle collision
   */
  private handleCollision(obstacle: Obstacle): void {
    if (!this.player) return;
    
    this.player.damage(obstacle.getDamage());
    
    if (obstacle.getType() === 'breakable') {
      obstacle.deactivate();
      this.player.addScore(100);
    }
    
    Logger.info('Collision detected', { 
      playerHealth: this.player.getState().health,
      obstacleType: obstacle.getType(),
      damage: obstacle.getDamage()
    });
  }
  
  /**
   * Setup UI elements
   */
  private setupUI(): void {
    // Score display
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.cssText = \`
      position: fixed;
      top: 10px;
      left: 10px;
      color: white;
      font-family: monospace;
      font-size: 24px;
      text-shadow: 2px 2px 2px black;
      z-index: 100;
      display: none;
    \`;
    this.scoreElement.id = 'game-score';
    document.body.appendChild(this.scoreElement);
    
    // Health display
    this.healthElement = document.createElement('div');
    this.healthElement.style.cssText = \`
      position: fixed;
      top: 10px;
      right: 10px;
      color: white;
      font-family: monospace;
      font-size: 24px;
      text-shadow: 2px 2px 2px black;
      z-index: 100;
      display: none;
    \`;
    this.healthElement.id = 'game-health';
    document.body.appendChild(this.healthElement);
    
    // Level display
    this.levelElement = document.createElement('div');
    this.levelElement.style.cssText = \`
      position: fixed;
      top: 50px;
      left: 10px;
      color: white;
      font-family: monospace;
      font-size: 18px;
      text-shadow: 2px 2px 2px black;
      z-index: 100;
      display: none;
    \`;
    this.levelElement.id = 'game-level';
    document.body.appendChild(this.levelElement);
  }
  
  /**
   * Update UI elements
   */
  private updateUI(): void {
    if (!this.player) return;
    
    const state = this.player.getState();
    
    if (this.scoreElement) {
      this.scoreElement.textContent = `SCORE: ${state.score}`;
    }
    
    if (this.healthElement) {
      this.healthElement.textContent = `HEALTH: ${state.health}`;
    }
    
    if (this.levelElement) {
      this.levelElement.textContent = `LEVEL: ${this.level}`;
    }
  }
  
  /**
   * Remove UI elements
   */
  private removeUI(): void {
    if (this.scoreElement && this.scoreElement.parentNode) {
      this.scoreElement.parentNode.removeChild(this.scoreElement);
    }
    if (this.healthElement && this.healthElement.parentNode) {
      this.healthElement.parentNode.removeChild(this.healthElement);
    }
    if (this.levelElement && this.levelElement.parentNode) {
      this.levelElement.parentNode.removeChild(this.levelElement);
    }
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener(GameEvents.PLAYER_SCORE, (e: any) => {
      const { points } = e.detail;
      if (this.player) {
        this.player.addScore(points);
      }
    });
    
    window.addEventListener(GameEvents.PLAYER_DEATH, () => {
      this.gameOver();
    });
  }
  
  /**
   * Game over handler
   */
  private gameOver(): void {
    this.isGameOver = true;
    
    // Show game over screen
    const gameOverDiv = document.createElement('div');
    gameOverDiv.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 24px;
      z-index: 1000;
    \`;
    
    if (this.player) {
      const state = this.player.getState();
      gameOverDiv.innerHTML = \`
        <h1>GAME OVER</h1>
        <p>Score: ${state.score}</p>
        <p>Level: ${this.level}</p>
        <button style="
          background: #00ff00;
          color: black;
          border: none;
          padding: 10px 20px;
          font-size: 20px;
          margin-top: 20px;
          cursor: pointer;
        " onclick="location.reload()">PLAY AGAIN</button>
      \`;
    }
    
    document.body.appendChild(gameOverDiv);
    
    Logger.info('Game over', { 
      score: this.player?.getState().score || 0,
      level: this.level
    });
  }
}
