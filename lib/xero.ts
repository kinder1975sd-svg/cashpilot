import { XeroClient } from 'xero-node'

// Lazy initialize to avoid build-time errors when env vars aren't set
let xeroInstance: XeroClient | null = null

function getXeroConfig() {
  const clientId = process.env.XERO_CLIENT_ID || ''
  const clientSecret = process.env.XERO_CLIENT_SECRET || ''
  const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/xero/callback'

  if (!clientId || !clientSecret) {
    // Return minimal config for build time - will fail if actually used
    return {
      clientId: 'build-time-placeholder',
      clientSecret: 'build-time-placeholder',
      redirectUris: [redirectUri],
      scopes: 'openid profile email accounting.transactions.read offline_access'.split(' '),
    }
  }

  return {
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: 'openid profile email accounting.transactions.read offline_access'.split(' '),
  }
}

export function getXeroInstance(): XeroClient {
  if (!xeroInstance) {
    xeroInstance = new XeroClient(getXeroConfig())
  }
  return xeroInstance
}

export const xero = getXeroInstance

export async function getXeroClient(accessToken: string, refreshToken: string) {
  const config = getXeroConfig()

  // Runtime check - throw if using placeholder values
  if (config.clientId === 'build-time-placeholder') {
    throw new Error('Xero environment variables (XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI) are not set')
  }

  const client = new XeroClient(config)

  client.setTokenSet({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return client
}
