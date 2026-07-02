/**
 * Utilitário de log formatado com cores ANSI para diferenciar
 * as saídas da API (Ingestão) e do Worker (Background).
 */

const Colors = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",
};

export class Logger {
  static info(message: string, ...args: any[]) {
    console.log(`${Colors.FgCyan}[API-WEB]${Colors.Reset} ${message}`, ...args);
  }

  static worker(message: string, ...args: any[]) {
    console.log(`${Colors.FgMagenta}[WORKER]${Colors.Reset} ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.log(`${Colors.FgYellow}[WARN]${Colors.Reset} ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`${Colors.FgRed}[ERROR]${Colors.Reset} ${message}`, ...args);
  }
}
