export type LogLevel = "info" | "warn" | "error";

type Meta = Record<string, unknown>;

const redactKeys = ["password", "token", "authorization", "auth", "secret"];

const sanitizeMeta = (meta?: Meta): Meta | undefined => {
  if (!meta) return undefined;
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (redactKeys.some((needle) => key.toLowerCase().includes(needle))) {
        return [key, "[REDACTED]"];
      }
      return [key, value];
    })
  );
};

export const logEvent = (level: LogLevel, message: string, meta?: Meta) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeMeta(meta),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }
  console.info(JSON.stringify(payload));
};
