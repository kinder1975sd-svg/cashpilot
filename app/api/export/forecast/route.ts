import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const format = url.searchParams.get('format') || 'csv'

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    // Check if user has Growth or Pro plan for export feature
    if (user.plan !== 'GROWTH' && user.plan !== 'PRO') {
      return new NextResponse('Export requires Growth or Pro plan', { status: 403 })
    }

    const forecast = await prisma.forecast.findFirst({
      where: { userId: user.id, isActive: true },
    })

    if (!forecast) {
      return new NextResponse('No forecast found', { status: 404 })
    }

    const weeks = forecast.weeks as {
      weekStart: string
      weekEnd: string
      weekLabel: string
      projected: number
      income: number
      expenses: number
    }[]

    if (format === 'csv') {
      const csv = generateCSV(weeks)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="cashpilot-forecast-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else if (format === 'json') {
      return NextResponse.json({
        generatedAt: forecast.generatedAt,
        weeks,
        summary: {
          currentCash: weeks[0]?.projected || 0,
          totalIncome: weeks.reduce((sum, w) => sum + w.income, 0),
          totalExpenses: weeks.reduce((sum, w) => sum + w.expenses, 0),
          lowestPoint: Math.min(...weeks.map((w) => w.projected)),
        },
      })
    }

    return new NextResponse('Invalid format', { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return new NextResponse('Export failed', { status: 500 })
  }
}

function generateCSV(weeks: {
  weekStart: string
  weekEnd: string
  weekLabel: string
  projected: number
  income: number
  expenses: number
}[]): string {
  const headers = [
    'Week',
    'Week Start',
    'Week End',
    'Projected Cash (£)',
    'Income (£)',
    'Expenses (£)',
    'Net Change (£)',
  ]

  const rows = weeks.map((week) => [
    week.weekLabel,
    new Date(week.weekStart).toLocaleDateString('en-GB'),
    new Date(week.weekEnd).toLocaleDateString('en-GB'),
    (week.projected / 100).toFixed(2),
    (week.income / 100).toFixed(2),
    (week.expenses / 100).toFixed(2),
    ((week.income - week.expenses) / 100).toFixed(2),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  return csvContent
}
