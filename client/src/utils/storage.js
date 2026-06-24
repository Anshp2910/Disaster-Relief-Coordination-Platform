export function safeGetItem(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

export function safeSetItem(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}

export function safeRemoveItem(key) {
  try { localStorage.removeItem(key) } catch {}
}

export function parseUser() {
  try {
    return JSON.parse(safeGetItem('user') || 'null')
  } catch {
    return null
  }
}
