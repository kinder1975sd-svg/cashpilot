import { XeroClient } from 'xero-node'

// Lazy initialize to avoid build-time errors when env vars aren't set
let xeroInstance: XeroClient | null = null

function getXeroConfig() {
  const clientId = process.env.XERO_CLIENT_ID
  const clientSecret = process.env.XERO_CLIENT_SECRET
  const redirectUri = process.env.XERO_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Xero environment variables (XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI) are not set')
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
  const client = new XeroClient(getXeroConfig())

  client.setTokenSet({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return client
}
