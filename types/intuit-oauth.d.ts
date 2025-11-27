declare module 'intuit-oauth' {
  export interface OAuthClientConfig {
    clientId: string
    clientSecret: string
    environment: string
    redirectUri: string
  }

  export interface TokenResponse {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    getJson(): {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      [key: string]: any
    }
  }

  export default class OAuthClient {
    constructor(config: OAuthClientConfig)
    authorizeUri(params: { scope: string[]; state: string }): string
    createToken(url: string): Promise<TokenResponse>
    refresh(): Promise<TokenResponse>
    refreshUsingToken(refreshToken: string): Promise<TokenResponse>
    makeApiCall(params: { url: string; method?: string; headers?: any; body?: any }): Promise<any>
  }
}
