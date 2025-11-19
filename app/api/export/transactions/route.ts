import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const months = parseInt(url.searchParams.get('months') || '12')

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    // Check if user has Growth or Pro plan
    if (user.plan !== 'GROWTH' && user.plan !== 'PRO') {
      return new NextResponse('Export requires Growth or Pro plan', { status: 403 })
    }

    const since = new Date()
    since.setMonth(since.getMonth() - months)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
    })

    const csv = generateTransactionsCSV(transactions)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="cashpilot-transactions-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return new NextResponse('Export failed', { status: 500 })
  }
}

function generateTransactionsCSV(transactions: {
  date: Date
  amount: number
  type: string
  description: string
  category: string | null
  contact: string | null
  source: string
}[]): string {
  const headers = [
    'Date',
    'Type',
    'Amount (£)',
    'Description',
    'Category',
    'Contact',
    'Source',
  ]

  const rows = transactions.map((txn) => [
    txn.date.toLocaleDateString('en-GB'),
    txn.type,
    (txn.amount / 100).toFixed(2),
    `"${txn.description.replace(/"/g, '""')}"`,
    txn.category || '',
    txn.contact ? `"${txn.contact.replace(/"/g, '""')}"` : '',
    txn.source,
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  return csvContent
}
