import { UserSession } from '@/types'

// Simple JWT implementation for development
// In production, use a proper JWT library like 'jsonwebtoken'

const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'

export async function sign(payload: UserSession): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (60 * 60 * 24 * 7) // 7 days
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload))
  
  const signature = await createSignature(`${encodedHeader}.${encodedPayload}`, SECRET_KEY)
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function verify(token: string): Promise<UserSession | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [encodedHeader, encodedPayload, signature] = parts
    
    // Verify signature
    const expectedSignature = await createSignature(`${encodedHeader}.${encodedPayload}`, SECRET_KEY)
    if (signature !== expectedSignature) {
      return null
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    // Return user session (remove JWT-specific fields)
    const { iat, exp, ...userSession } = payload
    return userSession as UserSession

  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str: string): string {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4)
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
}

async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
}