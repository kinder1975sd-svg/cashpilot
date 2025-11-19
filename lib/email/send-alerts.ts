import { prisma } from '@/lib/db'
import { sendEmail } from './resend'
import { lowCashAlertTemplate, weeklyDigestTemplate } from './templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cashpilot.app'

export async function sendLowCashAlert(userId: string, alert: {
  weekLabel: string
  projectedCash: number
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const html = lowCashAlertTemplate({
    userName: user.name || 'there',
    weekLabel: alert.weekLabel,
    projectedCash: alert.projectedCash,
    safetyBuffer: user.cashBuffer,
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({
    to: user.email,
    subject: alert.projectedCash < 0
      ? `[CRITICAL] Cash flow alert for ${alert.weekLabel}`
      : `Cash flow warning for ${alert.weekLabel}`,
    html,
  })
}

export async function sendWeeklyDigest(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get latest forecast
  const forecast = await prisma.forecast.findFirst({
    where: { userId, isActive: true },
  })

  if (!forecast) {
    return // No forecast to send
  }

  const weeks = forecast.weeks as {
    weekLabel: string
    projected: number
    income: number
    expenses: number
  }[]

  // Calculate metrics
  const currentCash = weeks[0]?.projected || 0
  const lowestWeek = weeks.reduce((min, week) =>
    week.projected < min.projected ? week : min
  )
  const totalIncome = weeks.reduce((sum, week) => sum + week.income, 0)
  const totalExpenses = weeks.reduce((sum, week) => sum + week.expenses, 0)

  // Get alert count
  const alertCount = await prisma.alert.count({
    where: { userId, dismissed: false },
  })

  const html = weeklyDigestTemplate({
    userName: user.name || 'there',
    currentCash,
    lowestPoint: lowestWeek.projected,
    lowestPointWeek: lowestWeek.weekLabel,
    totalIncome,
    totalExpenses,
    alertCount,
    dashboardUrl: `${APP_URL}/dashboard`,
  })

  await sendEmail({
    to: user.email,
    subject: `Your Weekly Cash Flow Summary - ${new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`,
    html,
  })
}

export async function sendAllWeeklyDigests() {
  // Get all users with active forecasts
  const users = await prisma.user.findMany({
    where: {
      forecasts: {
        some: { isActive: true },
      },
    },
    select: { id: true },
  })

  const results = {
    sent: 0,
    failed: 0,
  }

  for (const user of users) {
    try {
      await sendWeeklyDigest(user.id)
      results.sent++
    } catch (error) {
      console.error(`Failed to send digest to user ${user.id}:`, error)
      results.failed++
    }
  }

  return results
}
