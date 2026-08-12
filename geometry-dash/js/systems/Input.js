import { Scene } from 'phaser';
import { Constants } from '../utils/Constants.js';

export class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.jumpPressed = false;
        this.jumpReleased = true; // Start with jump released
        
        this.initKeyboard();
        this.initMouse();
        this.initTouch();
        
        // Event for other systems to subscribe to
        this.jumpCallbacks = [];
    }
    
    initKeyboard() {
        // Keyboard listeners
        this.scene.input.keyboard.on('keydown', (event) => {
            if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
                this.jumpPressed = true;
            }
        });
        
        this.scene.input.keyboard.on('keyup', (event) => {
            if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
                this.jumpReleased = true;
            }
        });
    }
    
    initMouse() {
        // Mouse click - left button only
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButton()) {
                this.jumpPressed = true;
            }
        });
    }
    
    initTouch() {
        // Touch tap
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.touch) {
                pointer.preventDefault();
                this.jumpPressed = true;
            }
        });
    }
    
    // Register callback for jump events
    onJump(callback) {
        this.jumpCallbacks.push(callback);
    }
    
    // Call all jump callbacks and reset flags
    checkJump() {
        if (this.jumpPressed && this.jumpReleased) {
            this.jumpCallbacks.forEach(cb => cb());
            this.jumpPressed = false;
            this.jumpReleased = false;
        }
    }
    
    // For Scene update loop
    update() {
        this.checkJump();
        
        // Reset flags each frame
        this.jumpPressed = false;
    }
}
