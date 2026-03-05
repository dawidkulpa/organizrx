// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

export function registryLog(
  level: 'info' | 'warn' | 'error',
  msg: string,
  data?: Record<string, unknown>
): void {
  const entry = JSON.stringify({
    level,
    component: 'plugin-registry',
    msg,
    time: new Date().toISOString(),
    ...data,
  })
  if (level === 'error' || level === 'warn') {
    process.stderr.write(entry + '\n')
  } else {
    process.stdout.write(entry + '\n')
  }
}
