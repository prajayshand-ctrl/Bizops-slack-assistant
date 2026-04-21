const LOG_PREFIX = "[bizops-bot]";

function formatMeta(meta = {}) {
  return Object.keys(meta).length ? meta : undefined;
}

export function logInfo(event, meta = {}) {
  console.log(`${LOG_PREFIX} INFO ${event}`, formatMeta(meta));
}

export function logWarn(event, meta = {}) {
  console.warn(`${LOG_PREFIX} WARN ${event}`, formatMeta(meta));
}

export function logError(event, error, meta = {}) {
  console.error(`${LOG_PREFIX} ERROR ${event}`, {
    ...meta,
    message: error?.message,
    stack: error?.stack,
  });
}