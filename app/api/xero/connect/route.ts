import { auth } from '@clerk/nextjs/server'
import { xero } from '@/lib/xero'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const consentUrl = await xero.buildConsentUrl()
    return NextResponse.redirect(consentUrl)
  } catch (error) {
    console.error('Xero connect error:', error)
    return new NextResponse('Failed to connect to Xero', { status: 500 })
  }
}
