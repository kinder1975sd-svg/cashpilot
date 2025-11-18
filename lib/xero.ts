import { XeroClient } from 'xero-node'

export const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUris: [process.env.XERO_REDIRECT_URI!],
  scopes: 'openid profile email accounting.transactions.read offline_access'.split(' '),
})

export async function getXeroClient(accessToken: string, refreshToken: string) {
  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: 'openid profile email accounting.transactions.read offline_access'.split(' '),
  })

  client.setTokenSet({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return client
}
