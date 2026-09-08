# Cluster Rush - Complete Node.js/JavaScript Rebuild Plan
**From Godot WebGL to Pure Node.js Web Game**

---

## 🎯 **CURRENT STATE ANALYSIS**

### What We Have Now:
- **Game Engine**: Godot 4.x (WebGL export)
- **Current Issue**: UI invisible, CORS blocks communication, game frozen
- **Export**: `Builds/WebGL/` - 39MB WASM + 280KB JS + HTML
- **Web Server**: `webgl_server.py` - Python server for WebGL
- **Attempted Fixes**: HTML overlay, Godot code workarounds, all CORS-limited

### Why Godot Failed:
1. **WebGL Bug**: Control UI nodes don't render in Godot 4.x WebGL
2. **CORS Barrier**: Can't communicate between HTML overlay and Godot engine
3. **Frozen State**: Game engine loads but doesn't accept inputs
4. **Multiple Export Attempts**: Same issues every time

---

## 🚀 **RECOMMENDED APPROACH: PURE NODE.JS + THREE.JS**

### Why NOT Godot:
- ❌ WebGL export bugs are fundamental (not fixable via config)
- ❌ CORS restrictions block cross-frame communication
- ❌ UI rendering failures persist across export versions
- ❌ No reliable way to start the actual game

### Why THREE.JS + Node.js:
- ✅ Full JavaScript control - no CORS issues within same page
- ✅ Direct DOM manipulation - no iframe isolation
- ✅ Physics via Cannon-es or Ammo.js
- ✅ Local Node.js server - no web deployment needed
- ✅ WebGL rendering - same performance as Godot
- ✅ Pure code - easy debugging and iteration

---

## 📋 **DETAILED IMPLEMENTATION PLAN**

### PHASE 1: PROJECT SETUP (Day 1)

#### Step 1.1: Initialize Node.js Project
```bash
cd ~/vishruth/games/clusterrush
npm init -y
```

#### Step 1.2: Install Dependencies
```bash
npm install three @types/three cannon-es @types/cannon-es serve
npm install -D typescript ts-node nodemon
```

#### Step 1.3: Create Project Structure
```
clusterrush/
├── src/
│   ├── main.ts              # Entry point
│   ├── game.ts              # Game class
│   ├── player.ts            # Player logic
│   ├── physics.ts           # Physics engine
│   ├── input.ts             # Input handling
│   ├── ui.ts                # UI system
│   ├── scene.ts             # Scene management
│   └── config.ts            # Game settings
├── assets/
│   ├── models/              # 3D models (GLTF)
│   ├── textures/            # Textures
│   └── sounds/              # Audio files
├── public/
│   └── index.html           # Main HTML page
├── package.json
├── tsconfig.json
├── server.config.js         # Node.js server config
└── README.md
```

---

### PHASE 2: CORE ENGINE (Day 2-3)

#### Step 2.1: Main Game Loop (src/main.ts)
```typescript
import { Game } from './game';

const game = new Game();
game.init();
game.start();
```

#### Step 2.2: Game Class (src/game.ts)
```typescript
import * as THREE from 'three';
import { Input } from './input';
import { Physics } from './physics';
import { UI } from './ui';
import { Player } from './player';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private input: Input;
  private physics: Physics;
  private ui: UI;
  private player: Player;
  private clock: THREE.Clock;
  private isRunning: boolean;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.input = new Input();
    this.physics = new Physics();
    this.ui = new UI();
    this.player = new Player();
    this.clock = new THREE.Clock();
    this.isRunning = false;
  }

  init(): void {
    this.setupRenderer();
    this.setupLights();
    this.setupCamera();
    this.setupEventListeners();
  }

  start(): void {
    this.isRunning = true;
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
  }

  private animate(): void {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    this.update(deltaTime);
    this.render();
  }

  private update(deltaTime: number): void {
    this.input.update();
    this.player.update(deltaTime);
    this.physics.update(deltaTime);
    this.ui.update();
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
```

---

### PHASE 3: GAMEPLAY SYSTEMS (Day 4-6)

#### Step 3.1: Player System (src/player.ts)
```typescript
import * as THREE from 'three';
import { Input } from './input';

export class Player {
  private mesh: THREE.Group;
  private velocity: THREE.Vector3;
  private speed: number;
  private jumpForce: number;
  private isGrounded: boolean;

  constructor() {
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 5;
    this.jumpForce = 10;
    this.isGrounded = true;

    // Create player mesh
    this.mesh = new THREE.Group();
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    
    this.mesh.add(cube);
  }

  update(deltaTime: number): void {
    // Movement
    if (this.input.isPressed('w')) {
      this.velocity.z = -this.speed;
    }
    if (this.input.isPressed('s')) {
      this.velocity.z = this.speed;
    }
    if (this.input.isPressed('a')) {
      this.velocity.x = -this.speed;
    }
    if (this.input.isPressed('d')) {
      this.velocity.x = this.speed;
    }

    // Jump
    if (this.input.isPressed(' ') && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Apply physics
    this.velocity.y -= 9.81 * deltaTime; // Gravity
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Ground collision
    if (this.mesh.position.y <= 0) {
      this.mesh.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }
}
```

---

### PHASE 4: LEVEL SYSTEM (Day 7-8)

#### Step 4.1: Level Manager
```typescript
import * as THREE from 'three';

export class LevelManager {
  private levelData: any[] = [];
  private currentLevel: number = 0;

  loadLevel(levelNumber: number): void {
    this.currentLevel = levelNumber;
    
    // Load level geometry
    const loader = new THREE.GLTFLoader();
    loader.load(`/assets/levels/level_${levelNumber}.gltf`, (gltf) => {
      scene.add(gltf.scene);
    });
  }

  getObstacles(): THREE.Mesh[] {
    // Return obstacle meshes for collision
    return [];
  }
}
```

---

### PHASE 5: PHYSICS & COLLISION (Day 9-10)

#### Step 5.1: Physics Engine
```typescript
import * as CANNON from 'cannon-es';

export class Physics {
  private world: CANNON.World;
  private bodies: CANNON.Body[] = [];

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
  }

  update(deltaTime: number): void {
    this.world.step(1 / 60, deltaTime, 3);
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }
}
```

---

### PHASE 6: UI SYSTEM (Day 11)

#### Step 6.1: HTML-based UI (no CORS issues!)
```typescript
export class UI {
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private menuEl: HTMLElement;
  private hudEl: HTMLElement;

  constructor() {
    this.setupUIElements();
  }

  private setupUIElements(): void {
    // Create menu
    this.menuEl = document.createElement('div');
    this.menuEl.innerHTML = `
      <div class="menu-container">
        <h1>CLUSTER RUSH</h1>
        <button id="start-btn">START GAME</button>
      </div>
    `;
    document.body.appendChild(this.menuEl);

    // Create HUD (hidden initially)
    this.hudEl = document.createElement('div');
    this.hudEl.style.display = 'none';
    this.hudEl.innerHTML = `
      <div class="hud-score">SCORE: <span id="score-label">0</span></div>
    `;
    document.body.appendChild(this.hudEl);

    // Setup event listeners
    document.getElementById('start-btn')?.addEventListener('click', () => {
      this.menuEl.style.display = 'none';
      this.hudEl.style.display = 'block';
    });
  }
}
```

---

### PHASE 7: BUILD & TEST (Day 12-14)

#### Build Commands
```bash
npm run build    # Compile TypeScript
npm run serve    # Start local server on port 8080
```

#### Test Checklist
- [ ] Game loads in browser
- [ ] Menu appears
- [ ] Click START → HUD appears
- [ ] Player moves with WASD
- [ ] Jump with SPACE
- [ ] Score updates
- [ ] Cross-browser compatible

---

## 📊 **IMPLEMENTATION TIMELINE**

| Day | Phase | Deliverable |
|-----|-------|-------------|
| 1 | Setup | Node.js project, dependencies |
| 2-3 | Core Engine | Game loop, renderer |
| 4-6 | Gameplay | Player, input, UI |
| 7-8 | Level System | Level loading |
| 9-10 | Physics | Physics engine |
| 11 | UI | HTML-based UI |
| 12 | Build | TypeScript build |
| 13-14 | Testing | Manual testing |

**Total Time**: 14 days (2 weeks)

---

## ✅ **SUCCESS CRITERIA**

- [ ] Game loads in browser
- [ ] HTML UI displays correctly
- [ ] Game accepts keyboard inputs
- [ ] Player moves and jumps
- [ ] No CORS errors
- [ ] Cross-browser compatible

---

**Ready to start implementation when you give the go-ahead.**