/**
 * Custom logger that only logs in development
 */

const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, ...args: unknown[]): void {
    if (!isDev) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    console[level](prefix, ...args);
  }

  debug(...args: unknown[]): void {
    this.log('log', ...args);
  }

  info(...args: unknown[]): void {
    this.log('info', ...args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', ...args);
  }

  error(...args: unknown[]): void {
    this.log('error', ...args);
  }

  /**
   * Group related logs together
   */
  group(label: string): void {
    if (!isDev) return;
    console.group(label);
  }

  groupEnd(): void {
    if (!isDev) return;
    console.groupEnd();
  }

  /**
   * Log with custom prefix for specific modules
   */
  withPrefix(prefix: string) {
    return {
      debug: (...args: unknown[]) => this.debug(`[${prefix}]`, ...args),
      info: (...args: unknown[]) => this.info(`[${prefix}]`, ...args),
      warn: (...args: unknown[]) => this.warn(`[${prefix}]`, ...args),
      error: (...args: unknown[]) => this.error(`[${prefix}]`, ...args),
    };
  }
}

export const logger = new Logger();

// Convenience exports for common use cases
export const authLogger = logger.withPrefix('AUTH');
export const dbLogger = logger.withPrefix('DATABASE');
export const apiLogger = logger.withPrefix('API');