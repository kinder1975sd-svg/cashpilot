import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { Alerts } from '@/components/dashboard/alerts'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { Button } from '@/components/ui/button'
import { generateForecast } from '@/lib/forecasting'
import { syncXeroTransactions } from '@/lib/xero-sync'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ xero?: string; checkout?: string }>
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    redirect('/sign-in')
  }

  const params = await searchParams

  // If Xero just connected, sync transactions and generate forecast
  if (params.xero === 'connected') {
    try {
      await syncXeroTransactions(user.id)
      await generateForecast(user.id)
    } catch (error) {
      console.error('Error syncing Xero:', error)
    }
  }

  const forecast = await prisma.forecast.findFirst({
    where: { userId: user.id, isActive: true },
  })

  const alerts = await prisma.alert.findMany({
    where: { userId: user.id, dismissed: false },
    orderBy: { createdAt: 'desc' },
  })

  const hasXero = !!user.xeroAccessToken

  // If no Xero connection, show connect prompt
  if (!hasXero) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">Connect Your Accounting Software</h1>
          <p className="text-muted-foreground mb-6">
            CashPilot needs access to your transactions to generate accurate 13-week
            cash flow forecasts. Your data is encrypted and secure.
          </p>
          <Button asChild size="lg">
            <a href="/api/xero/connect">Connect Xero</a>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            QuickBooks integration coming soon
          </p>
        </div>
      </div>
    )
  }

  // If no forecast yet, show loading/generating state
  if (!forecast) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating your forecast...</p>
        </div>
      </div>
    )
  }

  const weeks = forecast.weeks as {
    weekStart: string
    weekEnd: string
    weekLabel: string
    projected: number
    income: number
    expenses: number
  }[]

  // Calculate summary metrics
  const currentCash = weeks[0]?.projected || 0
  const lowestWeek = weeks.reduce((min, week) =>
    week.projected < min.projected ? week : min
  )
  const totalIncome = weeks.reduce((sum, week) => sum + week.income, 0)
  const totalExpenses = weeks.reduce((sum, week) => sum + week.expenses, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            13-week forecast generated {forecast.generatedAt.toLocaleDateString('en-GB', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/api/xero/connect">Sync Data</a>
          </Button>
        </div>
      </div>

      {/* Checkout success message */}
      {params.checkout === 'success' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Payment successful! Your plan has been upgraded.
          </p>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && <Alerts alerts={alerts} />}

      {/* Summary Cards */}
      <SummaryCards
        currentCash={currentCash}
        lowestPoint={lowestWeek.projected}
        lowestPointWeek={lowestWeek.weekLabel}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
      />

      {/* Chart */}
      <CashFlowChart weeks={weeks} buffer={user.cashBuffer} />

      {/* Bottom section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Upcoming Payments */}
        <UpcomingPayments userId={user.id} />

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Quick Actions</h2>
          <div className="grid gap-3">
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <a href="/settings">
                <div className="text-left">
                  <p className="font-medium">Adjust Safety Buffer</p>
                  <p className="text-sm text-muted-foreground">
                    Currently £{(user.cashBuffer / 100).toLocaleString()}
                  </p>
                </div>
              </a>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" disabled>
              <div className="text-left">
                <p className="font-medium">Scenario Planning</p>
                <p className="text-sm text-muted-foreground">
                  Coming in Growth plan
                </p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" disabled>
              <div className="text-left">
                <p className="font-medium">Export to Excel</p>
                <p className="text-sm text-muted-foreground">
                  Coming in Growth plan
                </p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
