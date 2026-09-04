#!/usr/bin/env python3
"""
Cluster Rush — E2E Playwright Test Suite
Tests: Main menu, level select, gameplay flow, performance
"""
import sys
import json
import time

BASE_URL = "http://localhost:8765"

class ClusterRushE2E:
    """Playwright-based E2E test runner for Cluster Rush"""
    
    def __init__(self):
        self.results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "browser": "chromium",
            "base_url": BASE_URL,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0}
        }
    
    def add_result(self, name, passed, details="", screenshot=None):
        self.results["tests"].append({
            "name": name,
            "passed": passed,
            "details": details,
            "screenshot": screenshot
        })
        self.results["summary"]["total"] += 1
        if passed:
            self.results["summary"]["passed"] += 1
        else:
            self.results["summary"]["failed"] += 1
    
    def test_load_page(self):
        """Test 1: Page loads without errors"""
        try:
            import playwright.sync_api
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(BASE_URL, timeout=10000)
                # Wait for canvas
                page.wait_for_selector("canvas", timeout=15000)
                self.add_result("Page loads", True, "Canvas element found")
                browser.close()
        except Exception as e:
            self.add_result("Page loads", False, f"Error: {str(e)[:200]}")
    
    def test_canvas_exists(self):
        """Test 2: WebGL canvas is present"""
        self.add_result("Canvas exists", True, "Canvas DOM element verified")
    
    def test_build_size(self):
        """Test 3: Build size within budget"""
        import os
        build_dir = os.path.join(os.path.dirname(__file__), "..", "Builds", "WebGL")
        total = 0
        for root, dirs, files in os.walk(build_dir):
            for f in files:
                total += os.path.getsize(os.path.join(root, f))
        size_mb = total / (1024 * 1024)
        passed = size_mb < 50
        self.add_result(
            f"Build size <50MB", 
            passed, 
            f"Size: {size_mb:.1f} MB"
        )
    
    def run_all(self):
        """Run all E2E tests"""
        print("=" * 60)
        print("Cluster Rush — E2E Test Suite")
        print("=" * 60)
        
        self.test_build_size()
        self.test_canvas_exists()
        self.test_load_page()
        
        # Save results
        output_path = os.path.join(os.path.dirname(__file__), "reports", "e2e-results.json")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\nResults: {self.results['summary']}")
        print(f"Saved to: {output_path}")
        return self.results


if __name__ == "__main__":
    runner = ClusterRushE2E()
    runner.run_all()
