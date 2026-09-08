# Cluster Rush - Enhanced README
## 🎮 3D Web Game with Spec-Driven + Test-Driven Development

## 📖 Overview
Cluster Rush is a 3D endless runner game being rebuilt from Godot WebGL to pure WebGL/Three.js to avoid CORS and rendering bugs. This project follows **spec-driven development** and **strict test-driven development** methodologies.

## 🚀 Quick Start

### Prerequisites
- Node.js v20.11.0 or higher
- Modern browser with WebGL support (Chrome 90+, Firefox 88+, Safari 14+)

### Installation & Development
```bash
# Clone repository
git clone <repository-url>
cd clusterrush

# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Run tests (TDD workflow)
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

**Development Server**: http://localhost:5173

## 📋 Project Structure

```
clusterrush/
├── src/                    # Source code
├── tests/                  # All test files (unit/integration/e2e)
├── public/                 # Static assets and HTML
├── config/                 # Build and tool configurations
├── docs/                   # Documentation
└── *.md                    # Planning and specification files
```

### Key Documentation Files
| File | Purpose |
|------|---------|
| `SPEC_DRIVEN_DEVELOPMENT.md` | Complete specification with user stories |
| `TDD_PLAN.md` | Test-driven development implementation guide |
| `REBUILD_PLAN.md` | Original 14-day implementation plan |
| `PROJECT_STATUS_ENHANCED.md` | Current project status and next steps |

## 🧪 Testing Strategy (TDD Enforcement)

### Test Commands
```bash
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e       # Browser E2E tests (Puppeteer)
npm run test:watch     # Watch mode for TDD workflow
npm run test:coverage  # Generate coverage report
```

### Coverage Requirements
- **Week 1**: 80%+ branch coverage
- **Week 2**: 85%+ branch coverage
- **Week 3**: 90%+ branch coverage

### TDD Workflow
1. **RED**: Write failing test describing expected behavior
2. **Verify RED**: Confirm test fails (not error)
3. **GREEN**: Write minimal code to pass test
4. **Verify GREEN**: Confirm test passes
5. **REFACTOR**: Clean code without changing behavior
6. **Verify REFACTOR**: All tests still pass

**Rule**: No production code without a failing test first.

## 🎯 Success Criteria

### Technical Metrics
- ✅ 90%+ test coverage (branch level)
- ✅ 60 FPS maintained under load
- ✅ <3 second initial load time
- ✅ No memory leaks in extended gameplay

### User Experience Metrics
- ✅ Input latency < 100ms
- ✅ All UI elements functional cross-browser
- ✅ No console errors/warnings
- ✅ Intuitive controls (WASD + SPACE)

## 🔧 Technology Stack

### Core Dependencies
- **Three.js v0.162.0** - 3D rendering engine
- **Cannon-es v0.20.0** - Physics simulation
- **TypeScript v5.4.5** - Type-safe development

### Development Tools
- **Vite v5.3.0** - Fast builds and dev server
- **Vitest v1.6.0** - Testing framework
- **Puppeteer v22.6.0** - Browser automation

## 📖 Development Phases

### Phase 1: Core Infrastructure (Week 1)
- Project setup with TDD from day 1
- Core game loop and input system
- Basic Three.js rendering pipeline
- **Target**: 80% test coverage

### Phase 2: Gameplay Systems (Week 2)
- Player movement and jump mechanics
- Physics integration with collision detection
- Scoring system and game state management
- **Target**: 85% test coverage

### Phase 3: Polish & Optimization (Week 3)
- UI system with DOM integration (no CORS!)
- Performance optimization and cross-browser testing
- Final integration and documentation
- **Target**: 90% test coverage

## 🚨 Important Notes

### Why Not Godot WebGL?
- **WebGL Bug**: Control UI nodes don't render in Godot 4.x WebGL
- **CORS Barrier**: Can't communicate between HTML overlay and Godot engine
- **Frozen State**: Game engine loads but doesn't accept inputs
- **Solution**: Pure JavaScript/TypeScript with Three.js avoids all these issues

### Key Architecture Decisions
1. **DOM-based UI**: HTML overlay instead of Canvas UI (no CORS issues)
2. **Single-page app**: No iframe isolation, direct DOM access
3. **Test-first approach**: Every feature developed with failing test first
4. **TypeScript strict mode**: Maximum type safety from the beginning

## 🤝 Contributing

### Development Workflow
1. Always start with a failing test (RED)
2. Write minimal implementation (GREEN)
3. Clean up code (REFACTOR)
4. Verify all tests pass before commit
5. Check coverage meets phase requirements

### Code Standards
- TypeScript strict mode compliance
- JSDoc comments for public APIs
- Consistent naming conventions
- No console errors/warnings in production

## 📄 License
MIT License - see LICENSE file for details

## 🙋‍♂️ Getting Help
- Review `SPEC_DRIVEN_DEVELOPMENT.md` for detailed specifications
- Check `TDD_PLAN.md` for implementation guidance
- Run tests after any changes

---

**Project Status**: ✅ Planning complete, ⏳ Ready for TDD implementation  
**Development Approach**: Spec-driven + Test-driven development  
**Expected Timeline**: 3 weeks (14 working days)  
**Confidence Level**: High (structured approach with verification checkpoints)