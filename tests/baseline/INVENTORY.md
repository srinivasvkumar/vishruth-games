# Cluster Rush - Code Inventory

## Overview
- **Generated**: 2026-09-08
- **Total Source Files**: 16
- **Total Test Files**: 5

## Technology Stack
- **Language**: TypeScript
- **Build Tool**: Vite
- **Testing Framework**: Vitest
- **3D Engine**: Three.js v0.162.0
- **Physics Engine**: Cannon-es v0.20.0
- **Test Environment**: happy-dom

## Files by Category
| Category | Count |
|----------|-------|
| core | 4 |
| entities | 2 |
| other | 1 |
| scenes | 3 |
| systems | 2 |
| types | 1 |
| utils | 3 |

## Source Files

- [CORE] `src/core/GameLoop.ts`
- [CORE] `src/core/Game.ts`
- [CORE] `src/core/index.ts`
- [CORE] `src/core/SceneManager.ts`
- [ENTITIES] `src/entities/Obstacle.ts`
- [ENTITIES] `src/entities/Player.ts`
- [OTHER] `src/index.ts`
- [SCENES] `src/scenes/BootScene.ts`
- [SCENES] `src/scenes/GameScene.ts`
- [SCENES] `src/scenes/Scene.ts`
- [SYSTEMS] `src/systems/Input.ts`
- [SYSTEMS] `src/systems/Physics.ts`
- [TYPES] `src/types/GameTypes.ts`
- [UTILS] `src/utils/AssetLoader.ts`
- [UTILS] `src/utils/Constants.ts`
- [UTILS] `src/utils/Logger.ts`

## Existing Tests

- `tests/setup/mock-cannon.ts`
- `tests/setup/mock-three.ts`
- `tests/unit/cicd-pipeline.test.ts`
- `tests/unit/hello-three.test.ts`
- `tests/unit/mock-strategy.test.ts`

## Coverage Gaps (Need Retroactive Tests)

- ⚠️ `src/core/GameLoop.ts` - No dedicated test file
- ⚠️ `src/core/SceneManager.ts` - No dedicated test file
- ⚠️ `src/systems/Input.ts` - No dedicated test file
- ⚠️ `src/systems/Physics.ts` - No dedicated test file
- ⚠️ `src/entities/Player.ts` - No dedicated test file
- ⚠️ `src/entities/Obstacle.ts` - No dedicated test file
- ⚠️ `src/utils/Constants.ts` - No dedicated test file
- ⚠️ `src/utils/Logger.ts` - No dedicated test file
- ⚠️ `src/utils/AssetLoader.ts` - No dedicated test file
