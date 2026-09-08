# Cluster Rush - Spec-Driven Development Specification

## SPECIFICATION VERSION: 1.0.0
**Status**: Approved for Implementation
**Created**: September 7, 2026
**Last Updated**: September 7, 2026

## OBJECTIVE
Build a 3D endless runner web game with these user stories:

**User Story 1: Game Initialization**
> As a player, I want to open the game in my browser and see a main menu so I can start playing immediately.
> **Acceptance Criteria**:
> - Game loads within 3 seconds on average network
> - Main menu displays prominently with START button
> - No console errors or warnings

**User Story 2: Core Gameplay**
> As a player, I want to control my character using WASD and SPACE keys to navigate through obstacles and collect power-ups.
> **Acceptance Criteria**:
> - WASD moves character in corresponding directions
> - SPACE triggers jump when character is grounded
> - Character falls naturally with gravity
> - Smooth movement at 60 FPS

**User Story 3: Scoring System**
> As a player, I want to see my score increase when I collect power-ups and avoid obstacles.
> **Acceptance Criteria**:
> - Score increments by +10 for each power-up collected
> - Score decrements by -50 when hitting obstacles
> - Score displayed in real-time on HUD
> - High score persists across browser sessions

**User Story 4: Game Progression**
> As a player, I want the game to increase in difficulty over time to maintain challenge.
> **Acceptance Criteria**:
> - Obstacle density increases every 30 seconds
> - Player speed increases by 10% every minute
> - New obstacle types introduced every 5 levels
> - Difficulty resets after game over

**User Story 5: Game State Management**
> As a player, I want clear feedback about game state and easy restart after game over.
> **Acceptance Criteria**:
> - Clear visual distinction between MENU, PLAYING, PAUSED, GAME_OVER states
> - One-click restart after game over
> - Progress saved at checkpoints (every 5 levels)

## TECH STACK

### Production Dependencies
```json
{
  "three": "^0.162.0",          // 3D rendering
  "cannon-es": "^0.20.0",       // Physics engine  
  "vite": "^5.3.0",             // Build tool & dev server
  "@types/three": "^0.162.0",   // TypeScript definitions
  "@types/cannon-es": "^0.20.0" // TypeScript definitions
}
```

### Development Dependencies
```json
{
  "typescript": "^5.4.5",      
  "vitest": "^1.6.0",           // Testing framework
  "puppeteer": "^22.6.0",       // E2E browser testing
  "eslint": "^9.3.0",           // Code linting
  "@types/node": "^20.11.0"     // Node.js types
}
```

## COMMANDS

### Development
```bash
npm run dev            # Start dev server (http://localhost:5173)
npm run build          # Build for production
npm run preview        # Preview production build
npm run lint           # Run ESLint type checking
```

### Testing (TDD-First)
```bash
npm run test           # Run all tests
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e       # Run browser E2E tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

## PROJECT STRUCTURE

```
clusterrush/
├── src/
│   ├── main.ts                 # Entry point (game bootstrap)
│   ├── game/
│   │   ├── Game.ts             # Main controller (orchestrates systems)
│   │   ├── Game.spec.ts        # Game tests (TDD-first)
│   │   ├── GameLoop.ts         # Animation frame loop
│   │   └── GameLoop.spec.ts    # Loop timing tests
│   ├── systems/
│   │   ├── InputSystem.ts      # Keyboard/mouse input
│   │   ├── PhysicsSystem.ts    # Physics simulation (Cannon-es)
│   │   ├── RenderSystem.ts     # Three.js rendering
│   │   ├── UISystem.ts         # DOM-based UI
│   │   ├── AudioSystem.ts      # Sound effects & music
│   │   └── tests/              # System integration tests
│   ├── entities/
│   │   ├── Player.ts          # Player character
│   │   ├── Obstacle.ts        # Blocking obstacles
│   │   ├── PowerUp.ts         # Collectible items
│   │   ├── Ground.ts          # Environment floor
│   │   └── tests/             # Entity behavior tests
│   ├── scenes/
│   │   ├── MainMenuScene.ts   # Menu navigation
│   │   ├── GameScene.ts       # Active gameplay
│   │   ├── GameOverScene.ts   # Score display
│   │   └── tests/             # Scene transition tests
│   └── utils/
│       ├── Constants.ts       # Game constants
│       ├── Random.ts          # Procedural generation
│       ├── Storage.ts         # Local persistence
│       ├── MathUtils.ts       # Game-specific math
│       └── tests/             # Utility function tests
├── tests/
│   ├── unit/                  # Unit tests (TDD cycle)
│   ├── integration/           # System integration tests
│   ├── e2e/                   # Browser E2E tests
│   └── fixtures/              # Test data & mocks
├── public/
│   ├── index.html            # Main HTML template
│   ├── assets/
│   │   ├── models/           # 3D models (GLTF)
│   │   ├── textures/         # Texture images
│   │   ├── sounds/           # Audio files
│   │   └── fonts/            # Web fonts
├── docs/
│   ├── architecture.md       # System architecture
│   ├── api/                 # API documentation
│   └── design/              # Game design documents
└── config/
    ├── tsconfig.json        # TypeScript configuration
    ├── vite.config.ts       # Vite build config
    ├── vitest.config.ts     # Test configuration
    └── eslint.config.js     # Code quality rules
```

## CODE STYLE & CONVENTIONS

### TypeScript Standards
```typescript
// Use strict type annotations
class Player {
  private readonly mesh: THREE.Mesh;
  private velocity: THREE.Vector3;
  private score: number = 0;
  
  // Constructor injection for testability
  constructor(
    private readonly scene: THREE.Scene,
    private readonly physics: PhysicsSystem
  ) {
    this.mesh = new THREE.Mesh();
    this.velocity = new THREE.Vector3(0, 0, 0);
  }
  
  // Public methods first, private methods last
  public update(deltaTime: number): void {
    this.applyVelocity(deltaTime);
    this.checkCollisions();
  }
  
  private applyVelocity(deltaTime: number): void {
    this.mesh.position.add(
      this.velocity.clone().multiplyScalar(deltaTime)
    );
  }
}

// Use interfaces for public APIs
interface GameConfig {
  width: number;
  height: number;
  physicsEnabled: boolean;
  debugMode: boolean;
}

// Strongly typed event system
type GameEvent = 
  | { type: 'SCORE_CHANGED'; delta: number; newScore: number }
  | { type: 'PLAYER_DIED'; position: THREE.Vector3 }
  | { type: 'LEVEL_COMPLETE'; level: number };
```

### Test-First Implementation Pattern
```typescript
// 1. RED: Write failing test
describe('ScoreManager', () => {
  it('increments score when adding points', () => {
    const manager = new ScoreManager();
    manager.addPoints(10);
    expect(manager.getScore()).toBe(10);
  });
});

// 2. GREEN: Minimal implementation
export class ScoreManager {
  private score: number = 0;
  
  addPoints(points: number): void {
    this.score += points;
  }
  
  getScore(): number {
    return this.score;
  }
}

// 3. REFACTOR: Clean up while tests pass
export class ScoreManager {
  private score: number = 0;
  
  addPoints(points: number): ScoreManager {
    this.score += points;
    return this; // Allow chaining
  }
  
  reset(): void {
    this.score = 0;
  }
  
  getScore(): number {
    return this.score;
  }
}
```

## TESTING STRATEGY

### Test Pyramid Structure
```
        E2E Tests (5%)
          /     \\
     Integration Tests (15%)
        /         \\
    Unit Tests (80%)
```

### Test Categories

**Unit Tests (80% of tests)**
- Test individual functions/methods
- Isolated from external systems
- Fast (<100ms per test)
- Run on every file change

**Integration Tests (15% of tests)**
- Test system interactions
- Physics → Rendering integration
- Input → Player movement chain
- Scene → UI communication

**E2E Tests (5% of tests)**
- Complete user flows
- Browser automation (Puppeteer)
- Performance validation
- Cross-browser compatibility

### Test Coverage Requirements
- **Function coverage**: 100% (all functions tested)
- **Branch coverage**: 90%+ (all code paths)
- **Statement coverage**: 95%+ (all lines executed)

## SYSTEM ARCHITECTURE

### Component Diagram
```
    ┌─────────────────────────────────────────────┐
    │                Main Game Loop               │
    ├─────────────────────────────────────────────┤
    │  Input → Physics → Render → UI → Audio      │
    └─────────────────────────────────────────────┘
          │           │           │           │
    ┌─────┴─────┐ ┌──┴──┐ ┌──────┴─────┐ ┌──┴──┐
    │ Keyboard  │ │Cannon│ │ Three.js  │ │ DOM │
    │  Events   │ │-es   │ │  WebGL    │ │ UI  │
    └───────────┘ └──────┘ └───────────┘ └─────┘
```

### Data Flow
1. **Frame Start**: GameLoop requests animation frame
2. **Input Processing**: Keyboard/mouse events collected
3. **Physics Simulation**: Cannon-es updates body positions
4. **Game Logic**: Score, collisions, state transitions
5. **Rendering**: Three.js renders updated scene
6. **UI Update**: DOM elements reflect game state

## SUCCESS CRITERIA (VERIFIABLE)

### Phase 1: Core Infrastructure (Week 1)
**Technical Criteria:**
- [ ] 80%+ test coverage on core systems
- [ ] 60 FPS maintained with empty scene
- [ ] Zero console errors on fresh load
- [ ] TypeScript strict mode compliance

**User-Facing Criteria:**
- [ ] Game loads in browser
- [ ] Black canvas visible (Three.js working)
- [ ] WASD keys detected (console output)

### Phase 2: Gameplay Systems (Week 2)
**Technical Criteria:**
- [ ] 85%+ test coverage on gameplay systems
- [ ] Physics integration tested
- [ ] Collision detection validated
- [ ] Input buffering functional

**User-Facing Criteria:**
- [ ] Green cube visible (player)
- [ ] WASD moves cube in 3D space
- [ ] SPACE triggers jump animation
- [ ] Cube falls with gravity

### Phase 3: Complete Game (Week 3)
**Technical Criteria:**
- [ ] 90%+ overall test coverage
- [ ] Cross-browser compatibility confirmed
- [ ] Performance maintains 60 FPS under load
- [ ] Memory leaks ≤ 1MB per minute

**User-Facing Criteria:**
- [ ] Main menu with START button
- [ ] Game: obstacles, power-ups, scoring
- [ ] Game over screen with restart
- [ ] Score persists across browser sessions

## BOUNDARIES

### Always
1. Write failing test before implementation
2. Run test to confirm failure (RED verification)
3. Commit tests and code together
4. Maintain 60 FPS performance target
5. Handle edge cases in input/validation
6. Clean console (no errors/warnings)
7. Follow TypeScript strict mode

### Ask First
1. Adding new dependencies
2. Changing build tool configuration
3. Major architectural changes
4. Adding third-party services
5. Modifying core rendering pipeline
6. Performance optimizations that reduce maintainability

### Never
1. Skip TDD for production code
2. Commit console errors/warnings
3. Break existing functionality without tests
4. Use browser-specific APIs without polyfills
5. Hardcode values that should be configurable
6. Write tests that depend on external services

## CONSTRAINT DOCUMENTATION

### Technical Constraints
1. **Browser support**: Chrome 90+, Firefox 88+, Safari 14+
2. **Performance target**: 60 FPS on mid-range hardware
3. **Load time**: <3 seconds on average network
4. **Memory usage**: <100MB after 5 minutes of gameplay
5. **Asset size**: <10MB total (compressed)

### Development Constraints
1. **Time budget**: 3 weeks total development
2. **Team size**: Solo developer
3. **Skill level**: Intermediate TypeScript/Three.js
4. **Testing**: Must maintain 90%+ coverage
5. **Documentation**: All public APIs documented

### Business Constraints
1. **Cost**: Zero budget (free tools only)
2. **Platform**: Web browser only (no mobile apps)
3. **Monetization**: None planned
4. **Distribution**: GitHub Pages compatible

## OPEN QUESTIONS (REQUIRE USER INPUT)

### Design Decisions
1. **Visual style**: Low-poly vs realistic vs abstract?
2. **Color scheme**: Bright/contrasting vs muted/subtle?
3. **Obstacle variety**: How many different obstacle types?
4. **Power-up effects**: Speed boost, invincibility, score multiplier?
5. **Audio design**: Background music? Sound effects priority?

### Gameplay Decisions
6. **Level generation**: Procedural vs fixed sequences?
7. **Difficulty curve**: Linear increase vs plateaus?
8. **Controls**: Keyboard-only or mouse support?
9. **Camera**: First-person, third-person, or fixed?
10. **Scoring**: Time-based, collection-based, or combo-based?

### Technical Decisions
11. **Save system**: localStorage vs IndexedDB?
12. **Analytics**: Basic stats collection needed?
13. **Multiplayer**: Any future plans requiring architecture changes?
14. **Mobile**: Responsive design for tablets?
15. **Offline**: Service worker for offline play?

## VALIDATION CHECKLIST

### Before Each Commit
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage report generated and reviewed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Manual test in Chrome
- [ ] Manual test in Firefox (if changed UI)
- [ ] Performance benchmark (FPS check)

### Before Release Candidate
- [ ] Cross-browser testing complete
- [ ] Mobile responsive testing (if applicable)
- [ ] Accessibility audit (keyboard navigation)
- [ ] Security review (no eval(), safe APIs)
- [ ] Load testing (100+ entities)
- [ ] Memory leak testing (5+ minute gameplay)

## NEXT STEPS

### Immediate (Day 1)
1. Initialize project with `npm init`
2. Install dependencies from Tech Stack  
3. Create project structure directories
4. Write first failing test for project initialization
5. Implement minimal setup to pass test

### Short-term (Week 1)
1. Complete Core Infrastructure phase
2. Achieve 80% test coverage
3. Basic rendering pipeline working
4. Input system detecting keyboard events

### Medium-term (Week 2)
1. Complete Gameplay Systems phase
2. Achieve 85% test coverage
3. Player movement with physics
4. Basic scoring and collision systems

### Long-term (Week 3)
1. Complete Polish & Optimization phase
2. Achieve 90%+ test coverage
3. Full game with UI and audio
4. Performance optimization complete

---

**APPROVAL**: This specification is ready for implementation using spec-driven development and test-driven development methodologies.