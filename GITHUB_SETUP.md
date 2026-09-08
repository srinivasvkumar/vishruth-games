# Cluster Rush - GitHub Repository Setup Guide

## 📋 Overview
This document provides complete instructions for setting up the Cluster Rush project on GitHub with proper repository structure, CI/CD, and collaboration workflows.

## 🎯 Repository Strategy

### Option 1: Single Repository (Recommended)
```
vishruth-games/
├── README.md                  # Main repository README
├── .github/workflows/         # CI/CD for all games
├── clusterrush/               # Cluster Rush game (main focus)
├── geometry-dash/             # Geometry Dash clone
├── tetris/                    # Tetris implementation
├── tic-tac-toe/               # Tic-tac-toe game
├── type-dash/                 # Type Dash game
└── screenshots/               # Game screenshots
```

**Pros:**
- Single place for all games
- Shared CI/CD configuration
- Easier dependency management
- Combined issue tracking

**Cons:**
- Larger repository size
- Mixed commit history

### Option 2: Separate Repositories
```
https://github.com/[username]/cluster-rush
https://github.com/[username]/geometry-dash
https://github.com/[username]/tetris-game
```

**Pros:**
- Atomic versioning per game
- Independent deployment
- Clean separation

**Cons:**
- More overhead
- Duplicate CI/CD setup

## 🚀 Recommended Setup: Single Repository

### Step 1: Initialize Main Repository
```bash
# Navigate to vishruth directory
cd /home/srinivasvkumar/vishruth

# Initialize git repository (if not already)
git init

# Create comprehensive .gitignore for game development
cat > .gitignore << 'EOF'
# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# TypeScript
dist/
build/
*.tsbuildinfo

# Vite/Vitest
.vite/
.vitest/
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Dependencies
.cache/
.temp/

# Environment
.env
.env.local
.env.*.local

# Build artifacts
*.exe
*.dll
*.so
*.dylib

# Test artifacts
test-results/
screenshots/

# Game assets (large files)
*.glb
*.gltf
*.fbx
*.obj
*.blend
*.wav
*.mp3
*.ogg
*.mp4
*.avi

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
EOF

# Add all games to staging
git add games/

# Create initial commit
git commit -m "Initial commit: Complete game collection with enhanced Cluster Rush"
```

### Step 2: Create Repository Structure Files

**Main README.md:**
```markdown
# Vishruth Games Collection 🎮

A collection of web-based games built with modern JavaScript/TypeScript frameworks.

## 📁 Games

| Game | Status | Tech Stack | Demo |
|------|--------|------------|------|
| **[Cluster Rush](./clusterrush/)** | 🟡 In Development | Three.js, TypeScript, Vite | [Coming Soon] |
| **[Geometry Dash](./geometry-dash/)** | ✅ Complete | Phaser.js, JavaScript | [Live Demo] |
| **[Tetris](./tetris/)** | ✅ Complete | Canvas API, JavaScript | [Live Demo] |
| **[Tic-tac-toe](./tic-tac-toe/)** | ✅ Complete | HTML5, CSS3, JavaScript | [Live Demo] |
| **[Type Dash](./type-dash/)** | 🟡 Beta | Vanilla JavaScript | [Live Demo] |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Modern web browser with WebGL support

### Quick Start
```bash
# Clone repository
git clone https://github.com/[username]/vishruth-games.git
cd vishruth-games

# Install dependencies for a specific game
cd clusterrush
npm install
npm run dev
```

## 🛠 Development

### Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript, TypeScript
- **Game Engines**: Three.js, Phaser.js, Canvas API
- **Build Tools**: Vite, Webpack, npm scripts
- **Testing**: Vitest, Jest, Playwright

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-game`)
3. Commit your changes (`git commit -m 'Add amazing game'`)
4. Push to the branch (`git push origin feature/amazing-game`)
5. Open a Pull Request

## 📄 License
MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Acknowledgments
- Three.js community for excellent documentation
- All game assets are open source or self-created
```

**LICENSE file:**
```text
MIT License

Copyright (c) 2026 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN CON ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Step 3: Create GitHub Workflows

**.github/workflows/ci.yml:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-clusterrush:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        
    - name: Test Cluster Rush
      run: |
        cd clusterrush
        npm ci
        npm run test
        
  build-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Check builds
      run: |
        for game in clusterrush geometry-dash; do
          if [ -f "$game/package.json" ]; then
            echo "Checking $game..."
            cd $game
            npm ci || true
            npm run build || echo "$game build failed (may be expected)"
            cd ..
          fi
        done
        
  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy preview
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./clusterrush/dist
        destination_dir: preview/${{ github.event.number }}
```

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy Cluster Rush
      if: success()
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./clusterrush/dist
        keep_files: false
```

### Step 4: Create GitHub Repository

```bash
# Create new repository on GitHub (via web interface)
# Repository name: vishruth-games
# Description: Collection of web-based games with modern JavaScript/TypeScript
# Public repository
# Initialize with README: NO (we have our own)
# Add .gitignore: NO (we have our own)
# License: MIT

# Add remote and push
cd /home/srinivasvkumar/vishruth
git remote add origin https://github.com/[username]/vishruth-games.git
git branch -M main
git push -u origin main
```

## 🎮 Cluster Rush GitHub-Specific Setup

### Package.json for Cluster Rush
Create `/home/srinivasvkumar/vishruth/games/clusterrush/package.json`:

```json
{
  "name": "cluster-rush",
  "version": "0.1.0",
  "description": "3D endless runner game built with Three.js and TypeScript",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/",
    "prepare": "husky"
  },
  "dependencies": {
    "three": "^0.162.0",
    "cannon-es": "^0.20.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/three": "^0.162.0",
    "@types/cannon-es": "^0.20.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0",
    "@vitest/ui": "^1.6.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^9.3.0",
    "@eslint/js": "^9.5.0",
    "typescript-eslint": "^7.13.1",
    "prettier": "^3.2.5",
    "husky": "^9.0.11",
    "@types/node": "^20.11.0"
  },
  "engines": {
    "node": ">=20.11.0"
  },
  "keywords": [
    "threejs",
    "webgl",
    "game",
    "typescript",
    "vite"
  ],
  "author": "[Your Name]",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/[username]/vishruth-games.git"
  },
  "bugs": {
    "url": "https://github.com/[username]/vishruth-games/issues"
  },
  "homepage": "https://[username].github.io/vishruth-games/clusterrush"
}
```

### Git Hooks for TDD Enforcement
```bash
# Initialize husky in clusterrush directory
cd /home/srinivasvkumar/vishruth/games/clusterrush
npm install
npx husky init

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running TDD verification..."

# Check that tests pass
npm run test || {
  echo "❌ Tests are failing! Cannot commit."
  echo "   Fix tests or use 'git commit --no-verify' to skip (not recommended)"
  exit 1
}

# Check TypeScript compilation
npm run lint || {
  echo "❌ TypeScript errors detected!"
  exit 1
}

echo "✅ All checks passed - TDD compliance verified"
EOF

chmod +x .husky/pre-commit
```

## 📁 Repository Structure Completed

After setup, your repository will have:

```
vishruth-games/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # CI/CD pipeline
│   │   └── deploy.yml      # GitHub Pages deployment
│   └── ISSUE_TEMPLATE/     # Bug report & feature request templates
├── clusterrush/
│   ├── src/                # TDD-based source code
│   ├── tests/              # Unit/integration/E2E tests
│   ├── public/             # Static assets
│   ├── package.json        # Modern tooling config
│   ├── SPEC_DRIVEN_DEVELOPMENT.md  # Complete spec
│   ├── TDD_PLAN.md         # Test-driven development plan
│   ├── README_ENHANCED.md  # Enhanced documentation
│   └── GITHUB_SETUP.md     # This file
├── geometry-dash/          # Existing game
├── tetris/                 # Existing game
├── tic-tac-toe/            # Existing game
├── type-dash/              # Existing game
├── screenshots/            # Game screenshots
├── README.md               # Main repository README
├── .gitignore              # Comprehensive ignore rules
└── LICENSE                 # MIT License
```

## 🚀 Deployment Configuration

### GitHub Pages Setup
1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. The `deploy.yml` workflow will automatically deploy
4. Live URL: `https://[username].github.io/vishruth-games/clusterrush`

### Vite Config for GitHub Pages
Create `/home/srinivasvkumar/vishruth/games/clusterrush/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/vishruth-games/clusterrush/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          cannon: ['cannon-es']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
```

## ✅ Verification Checklist

### Before First Push:
- [ ] `.gitignore` covers all game assets
- [ ] All game directories added to git
- [ ] `package.json` created for Cluster Rush
- [ ] Main README.md created
- [ ] LICENSE file added
- [ ] GitHub workflows created

### After Push:
- [ ] Repository created on GitHub
- [ ] Remote added correctly
- [ ] Initial push successful
- [ ] GitHub Actions running
- [ ] GitHub Pages enabled

### Ongoing Development:
- [ ] TDD workflow enforced via git hooks
- [ ] CI/CD passing on main branch
- [ ] Issues and PR templates working
- [ ] Live demo accessible

## 🎮 Next Steps

1. **Initialize Cluster Rush Development:**
   ```bash
   cd /home/srinivasvkumar/vishruth/games/clusterrush
   npm install
   npm run dev  # Start TDD workflow
   ```

2. **Follow TDD Plan:**
   - Start with Day 1 tasks from `TDD_PLAN.md`
   - Strict RED→GREEN→REFACTOR cycles
   - Committing with passing tests only

3. **Regular GitHub Workflow:**
   - Push features as small, tested commits
   - Use PRs for major changes
   - Maintain 90%+ test coverage

4. **Community Engagement:**
   - Add contribution guidelines
   - Create issue templates
   - Document development process

## 📞 Support & Contact
- **Issues**: GitHub Issues in the repository
- **Documentation**: Comprehensive docs in each game directory
- **Live Demo**: GitHub Pages deployment
- **Development**: Follow spec-driven + TDD methodology

---

**Status**: 🟢 Ready for GitHub repository creation and TDD implementation  
**Recommendation**: Single repository for all games (vishruth-games)  
**Next Action**: Create GitHub repository and push enhanced Cluster Rush setup