import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { oauthClient } from '@/lib/quickbooks'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const authUri = oauthClient.authorizeUri({
      scope: [
        'com.intuit.quickbooks.accounting',
      ],
      state: userId, // Pass userId to callback
    })

    return NextResponse.redirect(authUri)
  } catch (error) {
    console.error('QuickBooks connect error:', error)
    return new NextResponse('Failed to connect to QuickBooks', { status: 500 })
  }
}
