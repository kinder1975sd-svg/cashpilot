import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { oauthClient } from '@/lib/quickbooks'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  try {
    const url = new URL(req.url)
    const authResponse = await oauthClient.createToken(url.href)
    const tokens = authResponse.getJson()

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        qbAccessToken: tokens.access_token,
        qbRefreshToken: tokens.refresh_token,
        qbTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        qbRealmId: tokens.realmId,
        qbConnectedAt: new Date(),
      },
    })

    return NextResponse.redirect(new URL('/dashboard?quickbooks=connected', req.url))
  } catch (error) {
    console.error('QuickBooks callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?quickbooks=error', req.url))
  }
}
