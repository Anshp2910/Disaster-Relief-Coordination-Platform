const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info

function formatTimestamp() {
  return new Date().toISOString()
}

function structuredLog(level, message, meta = {}) {
  if (LOG_LEVELS[level] > CURRENT_LEVEL) return
  const entry = {
    timestamp: formatTimestamp(),
    level,
    message,
    ...meta,
    pid: process.pid,
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  error: (msg, meta) => structuredLog('error', msg, meta),
  warn: (msg, meta) => structuredLog('warn', msg, meta),
  info: (msg, meta) => structuredLog('info', msg, meta),
  debug: (msg, meta) => structuredLog('debug', msg, meta),
}
