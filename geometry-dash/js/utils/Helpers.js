// Helper functions
export const Helpers = {
    // Calculate distance percentage
    calculateDistance(currentX, totalDistance) {
        return Math.min(100, Math.max(0, Math.round((currentX / totalDistance) * 100)));
    },
    
    // Check collision between two rectangles
    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    },
    
    // Check if point is inside rectangle
    pointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    },
    
    // Get random color
    randomColor() {
        const colors = Object.values(Constants.COLORS);
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    // Distance between two points
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
};

// Import Constants for use in Helpers
import { Constants } from './Constants.js';
Object.assign(Helpers, { Constants });
