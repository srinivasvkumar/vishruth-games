import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import type { Game } from '@/core/Game';

/**
 * Minimal menu scene (W2-A.3, DECISION D2 boundary).
 *
 * Provides placeholder DOM content only — a title and a "Press START" hint.
 * Full menu UI (buttons, settings, high scores) is W3 Task 8.2.
 */
export class MenuScene extends Scene {
  private menuContainer!: HTMLDivElement;

  constructor(game: Game) {
    super(game);
    Logger.info('Menu scene created');
  }

  protected createCamera(): THREE.Camera {
    return new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- preserves the base class async contract; menu asset loading will be awaited in W3
  protected async onLoad(): Promise<void> {
    this.setupMenuUI();
    Logger.debug('Menu scene loaded');
  }

  protected onEnter(): void {
    if (this.menuContainer) {
      this.menuContainer.style.display = 'block';
    }
    Logger.debug('Menu scene entered');
  }

  protected onUpdate(_deltaTime: number): void {
    // No dynamic update logic in the minimal menu (W2-A.3 boundary).
  }

  protected onExit(): void {
    if (this.menuContainer) {
      this.menuContainer.style.display = 'none';
    }
    Logger.debug('Menu scene exited');
  }

  protected onCleanup(): void {
    this.menuContainer?.parentNode?.removeChild(this.menuContainer);
    Logger.debug('Menu scene cleaned up');
  }

  /**
   * Create the minimal placeholder DOM content.
   */
  private setupMenuUI(): void {
    const container = document.createElement('div');
    container.id = 'menu-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      font-family: monospace;
    `;

    const title = document.createElement('h1');
    title.textContent = 'CLUSTER RUSH';
    title.style.cssText = `
      color: #00ff00;
      font-size: 48px;
      margin-bottom: 20px;
      text-shadow: 0 0 10px #00ff00;
    `;

    const hint = document.createElement('p');
    hint.textContent = 'Press START to begin';
    hint.style.cssText = `
      color: #ffffff;
      font-size: 20px;
    `;

    container.appendChild(title);
    container.appendChild(hint);
    document.body.appendChild(container);
    this.menuContainer = container;
  }
}
