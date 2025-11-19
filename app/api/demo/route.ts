import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDemoData, clearDemoData } from '@/lib/demo-data'

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const { action } = await req.json()

    if (action === 'generate') {
      const result = await generateDemoData(user.id)
      return NextResponse.json({
        success: true,
        message: `Generated ${result.transactionCount} demo transactions`,
      })
    } else if (action === 'clear') {
      await clearDemoData(user.id)
      return NextResponse.json({
        success: true,
        message: 'Demo data cleared',
      })
    }

    return new NextResponse('Invalid action', { status: 400 })
  } catch (error) {
    console.error('Demo data error:', error)
    return new NextResponse('Failed to manage demo data', { status: 500 })
  }
}
