import { auth } from '@clerk/nextjs/server'
import { xero } from '@/lib/xero'
import { NextResponse } from 'next/server'
import { authRateLimiter, rateLimit } from '@/lib/rate-limit'

export async function GET(req: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req, authRateLimiter)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }

  const { userId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const client = xero()
    const consentUrl = await client.buildConsentUrl()
    return NextResponse.redirect(consentUrl)
  } catch (error) {
    console.error('Xero connect error:', error)
    return new NextResponse('Failed to connect to Xero', { status: 500 })
  }
}
