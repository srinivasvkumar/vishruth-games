import { Vector3, Group, Mesh, MeshStandardMaterial, BoxGeometry } from 'three';
import { GameConstants, GameEvents } from '@/utils/Constants';
import { Logger } from '@/utils/Logger';
import type { PlayerState } from '@/types/GameTypes';

/**
 * Player entity representing the main character
 */
export class Player {
  private mesh: Group;
  private velocity: Vector3;
  private state: PlayerState;
  private isAlive = true;
  
  constructor(position: Vector3) {
    this.velocity = new Vector3(0, 0, 0);
    this.state = {
      health: GameConstants.PLAYER_HEALTH,
      score: 0,
      lives: GameConstants.PLAYER_LIVES,
      powerUps: [],
      isInvincible: false,
      isJumping: false
    };
    
    // Create player mesh
    this.mesh = new Group();
    this.mesh.position.copy(position);
    
    // Main body (truck-sized: ~4 units wide, ~7 tall, ~8 long)
    const geometry = new BoxGeometry(4, 7, 8);
    const material = new MeshStandardMaterial({ color: 0x00ff00 });
    const body = new Mesh(geometry, material);
    body.position.y = 0; // group origin at truck center
    this.mesh.add(body);
    
    Logger.info('Player created at', position);
  }
  
  /**
   * Update player state
   */
  update(deltaTime: number, inputState: Record<string, boolean>): void {
    if (!this.isAlive) return;
    
    // Horizontal movement
    this.velocity.x = 0;
    this.velocity.z = 0;
    
    if (inputState.w || inputState.arrowup) {
      this.velocity.z = -GameConstants.PLAYER_SPEED;
    }
    if (inputState.s || inputState.arrowdown) {
      this.velocity.z = GameConstants.PLAYER_SPEED;
    }
    if (inputState.a || inputState.arrowleft) {
      this.velocity.x = -GameConstants.PLAYER_SPEED;
    }
    if (inputState.d || inputState.arrowright) {
      this.velocity.x = GameConstants.PLAYER_SPEED;
    }
    
    // Jump
    if ((inputState[' '] || inputState.arrowup) && !this.state.isJumping) {
      this.velocity.y = GameConstants.JUMP_FORCE;
      this.state.isJumping = true;
      // W2-C.2: fire the jump SFX trigger. The AudioSystem (bound in
      // Game.start()) listens for this window event and calls
      // playSfx('jump'). Emitted here — at the exact moment the jump
      // is applied — so the SFX is in sync with the physics.
      window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_JUMP));
      Logger.debug('Player jumped');
    }
    
    // Apply gravity
    this.velocity.y -= GameConstants.GRAVITY * deltaTime;
    
    // Clamp velocity
    this.velocity.clampLength(0, GameConstants.MAX_JUMP_VELOCITY);
    
    // Update position
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Check ground collision
    if (this.mesh.position.y <= 0) {
      this.mesh.position.y = 0;
      this.velocity.y = 0;
      this.state.isJumping = false;
    }
  }
  
  /**
   * Apply damage to player
   */
  damage(amount: number): void {
    if (this.state.isInvincible) return;
    
    this.state.health = Math.max(0, this.state.health - amount);
    
    if (this.state.health <= 0) {
      this.die();
    }
    
    Logger.warn('Player damaged', { damage: amount, health: this.state.health });
  }
  
  /**
   * Heal player
   */
  heal(amount: number): void {
    this.state.health = Math.min(GameConstants.PLAYER_HEALTH, this.state.health + amount);
    Logger.info('Player healed', { heal: amount, health: this.state.health });
  }
  
  /**
   * Add score
   */
  addScore(points: number): void {
    this.state.score += points;
    Logger.info('Score added', { points, total: this.state.score });
  }
  
  /**
   * Add power-up
   */
  addPowerUp(powerUpType: string, duration: number): void {
    this.state.powerUps.push(powerUpType);
    
    if (powerUpType === 'invincibility') {
      this.state.isInvincible = true;
      setTimeout(() => {
        this.state.isInvincible = false;
        this.state.powerUps = this.state.powerUps.filter(p => p !== powerUpType);
        Logger.info('Invincibility ended');
      }, duration);
    }
    
    Logger.info('Power-up added', { type: powerUpType, duration });
  }
  
  /**
   * Handle player death
   */
  private die(): void {
    this.isAlive = false;
    this.state.lives--;
    
    // W3-B.0-fix (v2): dispatch PLAYER_DEATH on EVERY death, not just the last.
    // The previous fix only dispatched in the else-branch (lives<=0), which is
    // unreachable on the first death (lives 3→2 takes the respawn branch).
    // GameScene's listener fires gameOver() — it checks lives internally.
    window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_DEATH));
    
    if (this.state.lives > 0) {
      Logger.warn('Player died, respawn available', { lives: this.state.lives });
      // Respawn logic would go here
    } else {
      Logger.error('Player game over');
    }
  }
  
  /**
   * Respawn player
   */
  respawn(position?: Vector3): void {
    if (this.isAlive) return;
    
    this.isAlive = true;
    this.state.health = GameConstants.PLAYER_HEALTH;
    
    if (position) {
      this.mesh.position.copy(position);
    } else {
      this.mesh.position.set(0, 1, 0);
    }
    
    this.velocity.set(0, 0, 0);
    this.state.isJumping = false;
    
    Logger.info('Player respawned at', this.mesh.position);
  }
  
  /**
   * Set player health to an exact value (W3-B.0 debug accessor).
   *
   * Clamps to [0, PLAYER_HEALTH]. A value of 0 or below triggers death
   * immediately (same path as `damage()` reaching 0). This is used by
   * `window.__setPlayerHealth(n)` in GameScene for deterministic E2E
   * testing of the game-over / restart path (B5 CP4) without relying
   * on collision timing.
   */
  setHealth(health: number): void {
    if (!this.isAlive) return;
    
    const clamped = Math.max(0, Math.min(GameConstants.PLAYER_HEALTH, Math.floor(health)));
    this.state.health = clamped;
    
    if (clamped <= 0) {
      this.die();
    }
    
    Logger.info('Player health set (debug)', { health: clamped });
  }
  
  // Public getters
  getMesh(): Group { return this.mesh; }
  getPosition(): Vector3 { return this.mesh.position.clone(); }
  getVelocity(): Vector3 { return this.velocity.clone(); }
  getState(): PlayerState { return { ...this.state }; }
  isPlayerAlive(): boolean { return this.isAlive; }
}
