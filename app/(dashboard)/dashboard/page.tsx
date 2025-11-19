import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { Alerts } from '@/components/dashboard/alerts'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { ConnectAccounting } from '@/components/dashboard/connect-accounting'
import { Button } from '@/components/ui/button'
import { generateForecast } from '@/lib/forecasting'
import { syncXeroTransactions } from '@/lib/xero-sync'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ xero?: string; quickbooks?: string; checkout?: string; demo?: string }>
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

  const hasConnection = !!user.xeroAccessToken || !!user.qbAccessToken || !!user.xeroConnectedAt
  const isDemo = !user.xeroAccessToken && !user.qbAccessToken && user.xeroConnectedAt

  // If no connection, show connect prompt
  if (!hasConnection) {
    return <ConnectAccounting />
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
        {!isDemo && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/api/xero/connect">Sync Data</a>
            </Button>
          </div>
        )}
      </div>

      {/* Checkout success message */}
      {params.checkout === 'success' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Payment successful! Your plan has been upgraded.
          </p>
        </div>
      )}

      {/* Demo mode banner */}
      {isDemo && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-blue-800 font-medium">Demo Mode Active</p>
            <p className="text-blue-600 text-sm">
              You&apos;re viewing sample data. Connect your accounting software for real forecasts.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/settings">Connect Real Data</a>
          </Button>
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
