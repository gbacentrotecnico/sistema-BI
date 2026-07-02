export interface LoggerContext {
  traceId?: string;
  correlationId?: string;
  executionId?: string;
  source?: string;
  integration?: string;
  event?: string;
}

export class Logger {
  private static formatLog(
    level: string,
    message: string,
    context?: LoggerContext,
    durationMs?: number,
    error?: Error | unknown
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: context?.traceId,
      correlationId: context?.correlationId,
      executionId: context?.executionId,
      source: context?.source,
      integration: context?.integration,
      event: context?.event,
      durationMs,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    };

    return JSON.stringify(logData);
  }

  static info(message: string, context?: LoggerContext, durationMs?: number) {
    console.log(this.formatLog('INFO', message, context, durationMs));
  }

  static warn(message: string, context?: LoggerContext, durationMs?: number) {
    console.warn(this.formatLog('WARN', message, context, durationMs));
  }

  static error(message: string, error?: Error | unknown, context?: LoggerContext, durationMs?: number) {
    console.error(this.formatLog('ERROR', message, context, durationMs, error));
  }

  static debug(message: string, context?: LoggerContext, durationMs?: number) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatLog('DEBUG', message, context, durationMs));
    }
  }
}
