/**
 * Logging utility with different severity levels
 */
export class Logger {
  private static readonly LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  };
  
  private static currentLevel: number = Logger.LOG_LEVELS.INFO;
  
  /**
   * Set the logging level
   */
  static setLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'none'): void {
    this.currentLevel = this.LOG_LEVELS[level.toUpperCase() as keyof typeof this.LOG_LEVELS];
  }
  
  /**
   * Log debug message
   */
  static debug(message: string, data?: any): void {
    if (this.currentLevel <= this.LOG_LEVELS.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
  
  /**
   * Log info message
   */
  static info(message: string, data?: any): void {
    if (this.currentLevel <= this.LOG_LEVELS.INFO) {
      console.log(`[INFO] ${message}`, data || '');
    }
  }
  
  /**
   * Log warning message
   */
  static warn(message: string, data?: any): void {
    if (this.currentLevel <= this.LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  }
  
  /**
   * Log error message
   */
  static error(message: string, data?: any): void {
    if (this.currentLevel <= this.LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, data || '');
    }
  }
  
  /**
   * Performance measurement
   */
  static measure<T>(label: string, fn: () => T): T {
    if (this.currentLevel <= this.LOG_LEVELS.DEBUG) {
      console.time(label);
      const result = fn();
      console.timeEnd(label);
      return result;
    }
    return fn();
  }
  
  /**
   * Group related logs
   */
  static group(label: string, collapsed: boolean = false): void {
    if (this.currentLevel <= this.LOG_LEVELS.DEBUG) {
      if (collapsed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
    }
  }
  
  /**
   * End group
   */
  static groupEnd(): void {
    if (this.currentLevel <= this.LOG_LEVELS.DEBUG) {
      console.groupEnd();
    }
  }
}
