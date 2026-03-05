export type { TotpSetupResponse, TempTokenPayload } from './db'

export { generateTotpSecret, verifyTotpCode } from './totp'

export { encryptSecret, decryptSecret } from './crypto'

export { generateBackupCodes, verifyBackupCode } from './backup-codes'

export {
  enableTwoFactor,
  disableTwoFactor,
  updateBackupCodes,
  getUserTotpData,
  createTempToken,
  verifyTempToken,
} from './db'
