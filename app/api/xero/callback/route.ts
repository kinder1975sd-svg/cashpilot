import { auth } from '@clerk/nextjs/server'
import { xero } from '@/lib/xero'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  try {
    const url = new URL(req.url)
    const tokenSet = await xero.apiCallback(url.href)

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Get tenants
    await xero.updateTenants()
    const tenants = xero.tenants

    await prisma.user.update({
      where: { id: user.id },
      data: {
        xeroAccessToken: tokenSet.access_token,
        xeroRefreshToken: tokenSet.refresh_token,
        xeroTokenExpiry: tokenSet.expires_at
          ? new Date(tokenSet.expires_at * 1000)
          : new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000),
        xeroTenantId: tenants?.[0]?.tenantId,
        xeroConnectedAt: new Date(),
      },
    })

    return NextResponse.redirect(new URL('/dashboard?xero=connected', req.url))
  } catch (error) {
    console.error('Xero callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?xero=error', req.url))
  }
}
