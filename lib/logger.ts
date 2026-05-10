type LogLevel = "debug" | "info" | "warn" | "error";

function line(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    const suffix = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta, null, 2)}` : "";
    // eslint-disable-next-line no-console -- thin logging wrapper
    console[level === "debug" ? "log" : level](`[skyflint] ${msg}${suffix}`);
    return;
  }
  // eslint-disable-next-line no-console -- JSON-lines to stdout in prod
  console.log(
    JSON.stringify({
      level,
      msg,
      ts: new Date().toISOString(),
      ...meta,
    })
  );
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    line("debug", msg, meta);
  },
  info(msg: string, meta?: Record<string, unknown>) {
    line("info", msg, meta);
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    line("warn", msg, meta);
  },
  error(msg: string, meta?: Record<string, unknown>) {
    line("error", msg, meta);
  },
};
