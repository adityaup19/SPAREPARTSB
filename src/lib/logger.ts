type Context = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, context?: Context) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (message: string, context?: Context) => write("info", message, context),
  warn: (message: string, context?: Context) => write("warn", message, context),
  error: (message: string, error?: unknown, context?: Context) =>
    write("error", message, {
      ...context,
      error: error instanceof Error ? error.message : String(error ?? ""),
    }),
};
