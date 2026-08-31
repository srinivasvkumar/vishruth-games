#!/bin/bash
# pipeline.sh — One-command: build + test + deploy
# Full sequence: import warm-up → GUT L1 → GUT L2 → export → :8765 → Playwright E2E
set -e

echo "========================================="
echo "🏭 Cluster Rush — Assembly Line Pipeline"
echo "========================================="

cd "$(dirname "$0")/.."

# Resolve Godot binary (CI uses ./Godot_v4.7.2-stable_linux.x86_64, local uses ./bin/godot)
GODOT="${GODOT:-./bin/godot}"

# ─────────────────────────────────────────────────────────────────────────────
# Step 0: Import warm-up (creates .godot/ import cache, avoids class-cache errors)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "📦 Step 0: Import warm-up (class-cache build)..."
if $GODOT --headless --import --path . 2>&1; then
    echo "✅ Import warm-up done"
else
    echo "⚠️ Import warm-up had warnings (non-fatal), continuing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Unit Tests (L1)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "📝 Step 1: Running Unit Tests (L1)..."
if $GODOT --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -ginclude_subdirs -gexit -gignore_pause -glog=2 2>&1; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests FAILED — blocking build"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Integration Tests (L2)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🔗 Step 2: Running Integration Tests (L2)..."
if $GODOT --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/integration -ginclude_subdirs -gexit -gignore_pause -glog=2 2>&1; then
    echo "✅ Integration tests passed"
else
    echo "❌ Integration tests FAILED — blocking build"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: WebGL Build (single-threaded, brotli=on per export_presets.cfg)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🏗️ Step 3: Building WebGL Export..."
mkdir -p Builds/WebGL
if $GODOT --headless --export-release "Web" Builds/WebGL/index.html 2>&1; then
    echo "✅ Build complete"
    echo "   Files:"
    ls -lh Builds/WebGL/ | awk '{print "   " $9, "("$5")"}'
else
    echo "❌ Build FAILED"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 3.5: .nojekyll (prevent Jekyll mangling on GitHub Pages)
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🔒 Step 3.5: Ensuring .nojekyll marker..."
if [ ! -f Builds/WebGL/.nojekyll ]; then
    touch Builds/WebGL/.nojekyll
    echo "✅ Created .nojekyll"
else
    echo "✅ .nojekyll already present"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Deploy to localhost
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🌐 Step 4: Starting CORS server on port 8765..."
pkill -f "cors_server.py" 2>/dev/null || true
sleep 1
python3 www/cors_server.py > /dev/null 2>&1 &
echo "✅ Server running on :8765"

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: E2E Tests (L3) — Playwright headless with SwiftShader
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🧪 Step 5: Running E2E Tests (L3)..."
if cd tests/e2e && npx playwright test 2>&1; then
    echo "✅ E2E tests passed"
else
    echo "❌ E2E tests FAILED"
    echo "   Server still running for debugging at http://localhost:8765"
    exit 1
fi

echo ""
echo "========================================="
echo "🎉 ALL GATES PASSED — Ready for testing!"
echo "   Open: http://localhost:8765"
echo "========================================="
