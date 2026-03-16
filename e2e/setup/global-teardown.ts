import { rmSync } from 'fs'

export default async function globalTeardown() {
  rmSync('/tmp/e2e-organizrx.ready', { force: true })
  rmSync('/tmp/e2e-organizrx.db', { force: true })
}
