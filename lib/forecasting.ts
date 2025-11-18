import { prisma } from './db'
import { startOfWeek, addWeeks, format } from 'date-fns'

interface RecurringItem {
  category: string
  avgAmount: number
  frequency: number
  type: string
}

interface WeekForecast {
  weekStart: string
  weekEnd: string
  weekLabel: string
  projected: number
  income: number
  expenses: number
}

export async function generateForecast(userId: string) {
  // Get last 12 months of transactions
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: twelveMonthsAgo },
    },
    orderBy: { date: 'asc' },
  })

  // Calculate current cash from transaction history
  // In production, you'd get this from Xero bank balance
  const currentCash = transactions.reduce((sum, txn) => {
    return sum + (txn.type === 'income' ? txn.amount : -txn.amount)
  }, 0)

  // Identify recurring transactions
  const recurringIncome = identifyRecurring(
    transactions.filter((t) => t.type === 'income'),
    'income'
  )
  const recurringExpenses = identifyRecurring(
    transactions.filter((t) => t.type === 'expense'),
    'expense'
  )

  // Generate 13-week forecast
  const weeks: WeekForecast[] = []
  let runningCash = currentCash

  for (let i = 0; i < 13; i++) {
    const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
    const weekEnd = addWeeks(weekStart, 1)

    // Project income for this week
    const projectedIncome = projectForWeek(recurringIncome)

    // Project expenses for this week
    const projectedExpenses = projectForWeek(recurringExpenses)

    runningCash = runningCash + projectedIncome - projectedExpenses

    weeks.push({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weekLabel: `Week ${i + 1} (${format(weekStart, 'MMM d')})`,
      projected: runningCash,
      income: projectedIncome,
      expenses: projectedExpenses,
    })
  }

  // Deactivate old forecasts
  await prisma.forecast.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  })

  // Store new forecast
  await prisma.forecast.create({
    data: {
      userId,
      weeks,
      isActive: true,
    },
  })

  // Generate alerts
  await generateAlerts(userId, weeks)

  return { weeks, currentCash }
}

function identifyRecurring(transactions: { amount: number; category: string | null; contact: string | null }[], type: string): RecurringItem[] {
  // Group by category/contact
  const grouped = new Map<string, { amount: number }[]>()

  transactions.forEach((txn) => {
    const key = txn.category || txn.contact || 'uncategorized'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(txn)
  })

  // Find recurring patterns (appears >3 times in the year)
  const recurring: RecurringItem[] = []

  grouped.forEach((txns, key) => {
    if (txns.length >= 3) {
      const avgAmount = txns.reduce((sum, t) => sum + t.amount, 0) / txns.length
      recurring.push({
        category: key,
        avgAmount: Math.round(avgAmount),
        frequency: txns.length,
        type,
      })
    }
  })

  return recurring
}

function projectForWeek(recurring: RecurringItem[]): number {
  // Simple projection: average weekly amount from recurring items
  // (total monthly amount / 4.33 weeks per month)
  const totalMonthly = recurring.reduce((sum, r) => {
    // Estimate monthly amount based on frequency over 12 months
    return sum + (r.avgAmount * r.frequency) / 12
  }, 0)

  return Math.round(totalMonthly / 4.33)
}

async function generateAlerts(userId: string, weeks: WeekForecast[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const buffer = user?.cashBuffer || 2500000 // Default £25,000 in pence

  // Clear old undismissed alerts
  await prisma.alert.deleteMany({
    where: { userId, dismissed: false },
  })

  // Check for low cash in next 13 weeks
  for (const week of weeks) {
    if (week.projected < buffer) {
      await prisma.alert.create({
        data: {
          userId,
          type: 'low_cash',
          severity: week.projected < 0 ? 'critical' : 'warning',
          title: week.projected < 0 ? 'Cash will run out' : 'Low cash warning',
          message: `Projected cash in ${week.weekLabel}: £${(week.projected / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}. This is below your safety buffer of £${(buffer / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}.`,
        },
      })
      // Only create one alert per low cash situation
      break
    }
  }
}

export { syncXeroTransactions } from './xero-sync'
