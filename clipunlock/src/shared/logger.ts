type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatMsg(module: string, msg: string): string {
  return `[CopyUnlock:${module}] ${msg}`;
}

export function createLogger(module: string) {
  return {
    debug(msg: string, ...args: unknown[]): void {
      if (shouldLog('debug')) console.debug(formatMsg(module, msg), ...args);
    },
    info(msg: string, ...args: unknown[]): void {
      if (shouldLog('info')) console.info(formatMsg(module, msg), ...args);
    },
    warn(msg: string, ...args: unknown[]): void {
      if (shouldLog('warn')) console.warn(formatMsg(module, msg), ...args);
    },
    error(msg: string, ...args: unknown[]): void {
      if (shouldLog('error')) console.error(formatMsg(module, msg), ...args);
    },
  };
}
