import { Logger } from '@/utils/Logger';

/**
 * GameLoop manages the timing and scheduling of the game update cycle
 */
export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private accumulatedTime: number = 0;
  private timeStep: number = 1000 / 60; // 60 FPS target
  private updateCallback: (deltaTime: number) => void;
  private renderCallback: () => void;
  private frameId: number = 0;
  
  constructor(
    updateCallback: (deltaTime: number) => void,
    renderCallback: () => void
  ) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
  }
  
  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame((time) => this.run(time));
    
    Logger.debug('Game loop started');
  }
  
  /**
   * Stop the game loop
   */
  stop(): void {
    if (!this.isRunning) return;
    
    cancelAnimationFrame(this.frameId);
    this.isRunning = false;
    this.accumulatedTime = 0;
    
    Logger.debug('Game loop stopped');
  }
  
  /**
   * Main loop runner
   */
  private run(currentTime: number): void {
    if (!this.isRunning) return;
    
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Accumulate time
    this.accumulatedTime += deltaTime;
    
    // Fixed time step updates
    while (this.accumulatedTime >= this.timeStep) {
      this.updateCallback(this.timeStep / 1000);
      this.accumulatedTime -= this.timeStep;
    }
    
    // Render
    this.renderCallback();
    
    // Schedule next frame
    this.frameId = requestAnimationFrame((time) => this.run(time));
  }
  
  /**
   * Set the target frame rate
   */
  setFrameRate(fps: number): void {
    this.timeStep = 1000 / fps;
    Logger.info(`Game loop frame rate set to ${fps} FPS`);
  }
  
  /**
   * Check if the game loop is running
   */
  isLoopRunning(): boolean {
    return this.isRunning;
  }
}
