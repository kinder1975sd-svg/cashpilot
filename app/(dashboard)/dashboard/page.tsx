import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { Alerts } from '@/components/dashboard/alerts'
import { Button } from '@/components/ui/button'
import { generateForecast } from '@/lib/forecasting'
import { syncXeroTransactions } from '@/lib/xero-sync'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ xero?: string }>
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
    weekLabel: string
    projected: number
    income: number
    expenses: number
  }[]
  const currentCash = weeks[0]?.projected || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Current cash:{' '}
            <span className={currentCash < 0 ? 'text-red-600' : 'text-green-600'}>
              £{(currentCash / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/xero/connect">Sync Xero</a>
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && <Alerts alerts={alerts} />}

      {/* Chart */}
      <CashFlowChart weeks={weeks} buffer={user.cashBuffer} />

      {/* Upcoming Payments */}
      <UpcomingPayments userId={user.id} />
    </div>
  )
}
