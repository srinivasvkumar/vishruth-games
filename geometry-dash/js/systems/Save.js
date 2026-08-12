export class SaveManager {
    constructor() {
        this.storageKey = 'geometry_dash_save';
        this.data = this.loadData();
    }
    
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load save data:', e);
        }
        
        // Return default data
        return {
            levels: {},
            totalAttempts: 0,
            totalLevelsCompleted: 0
        };
    }
    
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }
    
    // Get level data
    getLevelProgress(levelNum) {
        return this.data.levels[levelNum] || {
            bestScore: 0,
            attempts: 0,
            completed: false
        };
    }
    
    // Get attempts for level
    getLevelAttempts(levelNum) {
        return this.getLevelProgress(levelNum).attempts;
    }
    
    // Increment attempts
    incrementLevelAttempts(levelNum) {
        if (!this.data.levels[levelNum]) {
            this.data.levels[levelNum] = {
                bestScore: 0,
                attempts: 0,
                completed: false
            };
        }
        this.data.levels[levelNum].attempts++;
        this.data.totalAttempts++;
        this.save();
    }
    
    // Save level completion
    saveLevelProgress(levelNum, score) {
        if (!this.data.levels[levelNum]) {
            this.data.levels[levelNum] = {
                bestScore: 0,
                attempts: 0,
                completed: false
            };
        }
        
        if (score > this.data.levels[levelNum].bestScore) {
            this.data.levels[levelNum].bestScore = score;
        }
        
        if (score >= 100) {
            this.data.levels[levelNum].completed = true;
            this.data.totalLevelsCompleted++;
        }
        
        this.save();
    }
    
    // Get best score for level
    getBestScore(levelNum) {
        return this.getLevelProgress(levelNum).bestScore;
    }
    
    // Check if level is completed
    isLevelCompleted(levelNum) {
        return this.getLevelProgress(levelNum).completed;
    }
    
    // Reset progress
    resetProgress() {
        this.data = {
            levels: {},
            totalAttempts: 0,
            totalLevelsCompleted: 0
        };
        this.save();
    }
    
    // Get all levels
    getAllLevels() {
        return Object.keys(this.data.levels);
    }
}
