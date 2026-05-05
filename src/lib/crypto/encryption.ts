import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY is not set')
  const buf = Buffer.from(key, 'base64')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must decode to 32 bytes (base64)')
  return buf
}

export function encrypt(plainText: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    iv: iv.toString('base64'),
    content: encrypted.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

export function decrypt(payload: { iv: string; content: string; authTag: string }) {
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.content, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
