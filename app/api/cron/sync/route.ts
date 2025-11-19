import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncXeroTransactions } from '@/lib/xero-sync'
import { syncQuickBooksTransactions } from '@/lib/quickbooks-sync'
import { generateForecast } from '@/lib/forecasting'

// This endpoint is called by Vercel Cron or external cron service
// Add to vercel.json: { "crons": [{ "path": "/api/cron/sync", "schedule": "0 6 * * *" }] }

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Get all users with connected accounting software
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { xeroAccessToken: { not: null } },
          { qbAccessToken: { not: null } },
        ],
      },
      select: {
        id: true,
        xeroAccessToken: true,
        qbAccessToken: true,
      },
    })

    const results = {
      total: users.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const user of users) {
      try {
        // Sync from connected source
        if (user.xeroAccessToken) {
          await syncXeroTransactions(user.id)
        } else if (user.qbAccessToken) {
          await syncQuickBooksTransactions(user.id)
        }

        // Regenerate forecast
        await generateForecast(user.id)

        results.synced++
      } catch (error) {
        results.failed++
        results.errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error(`Sync failed for user ${user.id}:`, error)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Cron sync error:', error)
    return new NextResponse('Sync failed', { status: 500 })
  }
}
