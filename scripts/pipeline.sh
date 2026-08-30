#!/bin/bash
# pipeline.sh — One-command: build + test + deploy
set -e

echo "========================================="
echo "🏭 Cluster Rush — Assembly Line Pipeline"
echo "========================================="

cd "$(dirname "$0")/.."

# Step 1: Unit Tests (L1)
echo ""
echo "📝 Step 1: Running Unit Tests (L1)..."
if ./bin/godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gexit 2>&1; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests FAILED — blocking build"
    exit 1
fi

# Step 2: Integration Tests (L2)
echo ""
echo "🔗 Step 2: Running Integration Tests (L2)..."
if ./bin/godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/integration -gexit 2>&1; then
    echo "✅ Integration tests passed"
else
    echo "❌ Integration tests FAILED — blocking build"
    exit 1
fi

# Step 3: WebGL Build
echo ""
echo "🏗️ Step 3: Building WebGL Export..."
mkdir -p Builds/WebGL
if ./bin/godot --headless --export-release "Web" Builds/WebGL/index.html 2>&1; then
    echo "✅ Build complete"
    echo "   Files:"
    ls -lh Builds/WebGL/ | awk '{print "   " $9, "("$5")"}'
else
    echo "❌ Build FAILED"
    exit 1
fi

# Step 4: Deploy to localhost
echo ""
echo "🌐 Step 4: Starting CORS server on port 8765..."
pkill -f "cors_server.py" 2>/dev/null || true
sleep 1
python3 www/cors_server.py > /dev/null 2>&1 &
echo "✅ Server running"

# Step 5: E2E Tests (L3)
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
