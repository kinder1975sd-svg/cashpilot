import OAuthClient from 'intuit-oauth'

const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
})

export { oauthClient }

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
  const authResponse = await oauthClient.refreshUsingToken(refreshToken)
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
