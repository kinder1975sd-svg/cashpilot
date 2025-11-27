import OAuthClient from 'intuit-oauth'

// Lazy initialize to avoid build-time errors when env vars aren't set
let oauthClientInstance: OAuthClient | null = null

function getOAuthClient(): OAuthClient {
  if (!oauthClientInstance) {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('QuickBooks environment variables (QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REDIRECT_URI) are not set')
    }

    oauthClientInstance = new OAuthClient({
      clientId,
      clientSecret,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      redirectUri,
    })
  }
  return oauthClientInstance
}

export const oauthClient = getOAuthClient

export function getQuickBooksClient(accessToken: string, realmId: string) {
  return {
    accessToken,
    realmId,
    baseUrl: process.env.NODE_ENV === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com',
  }
}

export async function refreshQuickBooksToken(refreshToken: string) {
  const client = getOAuthClient()
  const authResponse = await client.refreshUsingToken(refreshToken)
  return authResponse.getJson()
}

export async function makeQuickBooksRequest(
  accessToken: string,
  realmId: string,
  endpoint: string
) {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

  const response = await fetch(`${baseUrl}/v3/company/${realmId}/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`QuickBooks API error: ${response.statusText}`)
  }

  return response.json()
}
