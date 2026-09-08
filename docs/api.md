# API Reference

## Core Classes

### Game
The main game controller class that manages the game loop, scenes, and systems.

```typescript
class Game {
  constructor(config: GameConfig): Game
  start(): void
  pause(): void
  resume(): void
  stop(): void
  switchScene(sceneName: string): void
}
```

### Player
Represents the player character with movement, collision, and state management.

```typescript
class Player {
  constructor(position: Vector3): Player
  move(direction: Vector3): void
  jump(): void
  isGrounded(): boolean
  getScore(): number
}
```

### SceneManager
Manages scene transitions and scene lifecycle.

```typescript
class SceneManager {
  constructor(game: Game): SceneManager
  loadScene(scene: Scene): Promise<void>
  unloadScene(sceneName: string): void
  getCurrentScene(): Scene
}
```

## Systems

### PhysicsSystem
Handles all physics calculations and collision detection.

```typescript
class PhysicsSystem {
  constructor(gravity: number = 9.81): PhysicsSystem
  addBody(body: PhysicsBody): void
  removeBody(body: PhysicsBody): void
  update(deltaTime: number): void
  checkCollision(body1: PhysicsBody, body2: PhysicsBody): boolean
}
```

### InputSystem
Manages user input from keyboard, mouse, and touch.

```typescript
class InputSystem {
  constructor(): InputSystem
  bindKey(key: string, action: string): void
  isPressed(action: string): boolean
  getMousePosition(): Vector2
  on(action: string, callback: Function): void
}
```

## Utility Functions

### AssetLoader
Handles loading of 3D models, textures, and audio files.

```typescript
class AssetLoader {
  static loadTexture(url: string): Promise<Texture>
  static loadModel(url: string): Promise<Group>
  static loadAudio(url: string): Promise<AudioBuffer>
  static preload(assets: AssetList): Promise<void>
}
```

### Logger
Provides logging with different severity levels.

```typescript
class Logger {
  static info(message: string, data?: any): void
  static warn(message: string, data?: any): void
  static error(message: string, data?: any): void
  static debug(message: string, data?: any): void
}
```

## Constants

### GameConstants
```typescript
const GameConstants = {
  GRAVITY: 9.81,
  PLAYER_SPEED: 5.0,
  JUMP_FORCE: 10.0,
  SCORE_MULTIPLIER: 100,
  MAX_LEVEL: 10,
  OBSTACLE_SPAWN_RATE: 1.5
}
```

### InputConstants
```typescript
const InputConstants = {
  KEY_W: 'w',
  KEY_A: 'a',
  KEY_S: 's',
  KEY_D: 'd',
  KEY_SPACE: ' ',
  KEY_ENTER: 'Enter',
  KEY_ESCAPE: 'Escape'
}
```

## Events

### Game Events
- `game:start` - Game started
- `game:pause` - Game paused
- `game:resume` - Game resumed
- `game:stop` - Game stopped
- `scene:loaded` - Scene loaded successfully
- `scene:error` - Scene failed to load

### Player Events
- `player:move` - Player moved
- `player:jump` - Player jumped
- `player:collide` - Player collided with object
- `player:score` - Player scored points
- `player:death` - Player died

### UI Events
- `ui:menu:open` - Menu opened
- `ui:menu:close` - Menu closed
- `ui:button:click` - Button clicked
- `ui:score:update` - Score updated
