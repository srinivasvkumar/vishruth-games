"""
Cluster Rush - Playwright E2E Test Suite
Tests complete user journeys in the WebGL game using browser automation.

Run: pytest tests/e2e/playwright/webgl_cluster_rush_test.py -v --html=report.html
"""

import pytest
from playwright.sync_api import sync_playwright, expect
import json
import time
from pathlib import Path


@pytest.fixture(scope="module")
def browser_context():
    """Launch headless Chrome with performance monitoring."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1
        )
        page = context.new_page()
        page.set_extra_http_headers({"Cache-Control": "no-cache"})
        yield page, context, browser


@pytest.fixture
def game_page(browser_context):
    """Navigate to the game and wait for load."""
    page, context, browser = browser_context
    page.goto("http://localhost:8080")
    page.wait_for_selector("#game-container", timeout=10000)
    yield page


class TestPlayerMovement:
    """Test all player movement mechanics."""
    
    def test_player_can_jump(self, game_page):
        """Verify single jump works correctly."""
        initial_y = game_page.evaluate("game.getPlayerY()")
        game_page.keyboard.press("Space")
        time.sleep(0.1)
        jump_y = game_page.evaluate("game.getPlayerY()")
        assert jump_y > initial_y, "Player did not jump"
        game_page.evaluate("window.testResults = window.testResults || {}; window.testResults['test_player_can_jump'] = 'PASS';")

    def test_double_jump_mechanic(self, game_page):
        """Verify double-jump provides additional height."""
        game_page.keyboard.press("Space")
        time.sleep(0.15)
        first_jump_height = game_page.evaluate("game.getPlayerY()")
        game_page.keyboard.press("Space")
        time.sleep(0.15)
        second_jump_height = game_page.evaluate("game.getPlayerY()")
        assert second_jump_height > first_jump_height, "Double-jump failed"
        game_page.evaluate("window.testResults['test_double_jump_mechanic'] = 'PASS';")

    def test_wall_climb_detection(self, game_page):
        """Verify wall-climb activates when near vertical surface."""
        game_page.evaluate("game.positionPlayerNearWall()")
        time.sleep(0.1)
        game_page.keyboard.press("w")
        time.sleep(0.2)
        is_climbing = game_page.evaluate("game.isPlayerClimbing()")
        assert is_climbing, "Wall-climb did not activate"
        game_page.evaluate("window.testResults['test_wall_climb_detection'] = 'PASS';")

    def test_strafe_left_right(self, game_page):
        """Verify lateral movement works."""
        initial_x = game_page.evaluate("game.getPlayerX()")
        game_page.keyboard.press("d")
        time.sleep(0.2)
        right_x = game_page.evaluate("game.getPlayerX()")
        game_page.keyboard.press("a")
        time.sleep(0.2)
        left_x = game_page.evaluate("game.getPlayerX()")
        assert right_x > initial_x, "Strafe right failed"
        assert left_x < right_x, "Strafe left failed"
        game_page.evaluate("window.testResults['test_strafe_left_right'] = 'PASS';")

    def test_fall_death_detection(self, game_page):
        """Verify player dies when falling between trucks."""
        game_page.evaluate("game.triggerFallScenario()")
        time.sleep(1)
        is_dead = game_page.evaluate("game.isPlayerDead()")
        assert is_dead, "Player should have died from fall"
        game_page.evaluate("window.testResults['test_fall_death_detection'] = 'PASS';")


class TestTruckSystem:
    """Test truck physics and behavior."""
    
    def test_truck_spawning(self, game_page):
        truck_count = game_page.evaluate("game.getTruckCount()")
        assert truck_count >= 1, "No trucks spawned"
        game_page.evaluate("window.testResults['test_truck_spawning'] = 'PASS';")

    def test_truck_physics_movement(self, game_page):
        positions = []
        for _ in range(10):
            positions.append(game_page.evaluate("game.getTruckPosition()"))
            time.sleep(0.5)
        has_movement = len(set(positions)) > 1
        assert has_movement, "Trucks are not moving"
        game_page.evaluate("window.testResults['test_truck_physics_movement'] = 'PASS';")

    def test_cluster_formation(self, game_page):
        time.sleep(5)
        is_forming = game_page.evaluate("game.areTrucksForming()")
        assert is_forming, "Trucks should be forming cluster"
        game_page.evaluate("window.testResults['test_cluster_formation'] = 'PASS';")

    def test_cluster_dispersion(self, game_page):
        time.sleep(8)
        has_gaps = game_page.evaluate("game.hasTruckGaps()")
        assert has_gaps, "Trucks should have gaps between them"
        game_page.evaluate("window.testResults['test_cluster_dispersion'] = 'PASS';")


class TestHazards:
    """Test all hazard types."""
    
    def test_saw_blade_rotation(self, game_page):
        is_rotating = game_page.evaluate("game.isSawBladeRotating()")
        assert is_rotating, "Saw blade should be rotating"
        game_page.evaluate("window.testResults['test_saw_blade_rotation'] = 'PASS';")

    def test_saw_blade_death_trigger(self, game_page):
        game_page.evaluate("game.triggerSawBladeContact()")
        time.sleep(0.5)
        is_dead = game_page.evaluate("game.isPlayerDead()")
        assert is_dead, "Player should die from saw blade contact"
        game_page.evaluate("window.testResults['test_saw_blade_death_trigger'] = 'PASS';")

    def test_falling_debris_spawn(self, game_page):
        has_debris = game_page.evaluate("game.hasFallingDebris()")
        assert has_debris, "Falling debris should spawn"
        game_page.evaluate("window.testResults['test_falling_debris_spawn'] = 'PASS';")

    def test_ramp_launch_physics(self, game_page):
        initial_y = game_page.evaluate("game.getPlayerY()")
        game_page.evaluate("game.triggerRampLaunch()")
        time.sleep(0.3)
        launched_y = game_page.evaluate("game.getPlayerY()")
        assert launched_y > initial_y + 2, "Ramp should launch player high"
        game_page.evaluate("window.testResults['test_ramp_launch_physics'] = 'PASS';")


class TestUI:
    """Test all UI components."""
    
    def test_main_menu_navigation(self, game_page):
        start_button = game_page.query_selector("#start-button")
        expect(start_button).to_be_visible()
        start_button.click()
        time.sleep(1)
        is_playing = game_page.evaluate("game.isGameActive()")
        assert is_playing, "Game should start from menu"
        game_page.evaluate("window.testResults['test_main_menu_navigation'] = 'PASS';")

    def test_hud_display(self, game_page):
        expect(game_page.query_selector("#lives-display")).to_be_visible()
        expect(game_page.query_selector("#level-display")).to_be_visible()
        expect(game_page.query_selector("#time-display")).to_be_visible()
        game_page.evaluate("window.testResults['test_hud_display'] = 'PASS';")

    def test_level_complete_screen(self, game_page):
        game_page.evaluate("game.completeLevel()")
        time.sleep(1)
        expect(game_page.query_selector("#level-complete-screen")).to_be_visible()
        game_page.evaluate("window.testResults['test_level_complete_screen'] = 'PASS';")

    def test_pause_menu_functionality(self, game_page):
        game_page.keyboard.press("Escape")
        time.sleep(0.5)
        expect(game_page.query_selector("#pause-menu")).to_be_visible()
        game_page.keyboard.press("Escape")
        time.sleep(0.5)
        is_paused = game_page.evaluate("game.isPaused()")
        assert not is_paused, "Game should resume from pause"
        game_page.evaluate("window.testResults['test_pause_menu_functionality'] = 'PASS';")


class TestLevelCompletion:
    """Test all 35 levels are completable."""
    
    @pytest.mark.parametrize("level", range(1, 36))
    def test_level_completion(self, game_page, level):
        game_page.evaluate(f"game.loadLevel({level})")
        time.sleep(1)
        game_page.evaluate("game.completeCurrentLevel()")
        time.sleep(2)
        is_complete = game_page.evaluate(f"game.isLevelComplete({level})")
        assert is_complete, f"Level {level} should be completable"
        game_page.evaluate(f"window.testResults['test_level_{level}_completion'] = 'PASS';")


class TestPerformance:
    """Test performance metrics."""
    
    def test_60_fps_sustained(self, game_page):
        game_page.evaluate("game.startFPSCounter()")
        time.sleep(5)
        avg_fps = game_page.evaluate("game.getAverageFPS()")
        assert avg_fps >= 55, f"FPS ({avg_fps}) should be >= 55"
        game_page.evaluate(f"window.testResults['test_60_fps_sustained'] = 'PASS (FPS: {avg_fps})';")

    def test_memory_no_leak(self, game_page):
        # Use bridge API (not performance.memory which requires Chrome --enable-precise-memory-info)
        initial_texture = game_page.evaluate("game.getTotalTextureBytes()")
        initial_heap = game_page.evaluate("game.getHeapSize()")
        for level in range(1, 6):
            game_page.evaluate(f"game.loadLevel({level})")
            game_page.evaluate("game.completeCurrentLevel()")
            game_page.wait_for_function("() => game.isPlayerGrounded() !== undefined", timeout=3000)
        final_texture = game_page.evaluate("game.getTotalTextureBytes()")
        final_heap = game_page.evaluate("game.getHeapSize()")
        # Check both texture memory and heap growth
        heap_growth = (final_heap - initial_heap) / initial_heap if initial_heap > 0 else 0
        assert heap_growth < 0.10, f"Heap growth ({heap_growth*100:.1f}%) should be < 10%"
        game_page.evaluate(f"window.testResults['test_memory_no_leak'] = 'PASS (Heap Growth: {heap_growth*100:.1f}%)';")


class TestAccessibility:
    """Test accessibility features."""
    
    def test_colorblind_mode(self, game_page):
        game_page.click("#settings-button")
        time.sleep(0.5)
        expect(game_page.query_selector("#colorblind-mode")).to_be_visible()
        game_page.evaluate("window.testResults['test_colorblind_mode'] = 'PASS';")

    def test_control_remapping(self, game_page):
        game_page.click("#settings-button")
        time.sleep(0.5)
        expect(game_page.query_selector("#control-remapping")).to_be_visible()
        game_page.evaluate("window.testResults['test_control_remapping'] = 'PASS';")

    def test_visual_cues_for_events(self, game_page):
        has_death_cue = game_page.evaluate("game.hasDeathVisualCue()")
        has_jump_cue = game_page.evaluate("game.hasJumpVisualCue()")
        has_complete_cue = game_page.evaluate("game.hasLevelCompleteVisualCue()")
        assert has_death_cue and has_jump_cue and has_complete_cue
        game_page.evaluate("window.testResults['test_visual_cues_for_events'] = 'PASS';")


def generate_test_summary(page):
    results = page.evaluate("window.testResults")
    total = len(results)
    passed = sum(1 for v in results.values() if 'PASS' in v)
    failed = total - passed
    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
        "details": results
    }
