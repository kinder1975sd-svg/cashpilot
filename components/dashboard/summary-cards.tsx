'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SummaryCardsProps {
  currentCash: number
  lowestPoint: number
  lowestPointWeek: string
  totalIncome: number
  totalExpenses: number
}

export function SummaryCards({
  currentCash,
  lowestPoint,
  lowestPointWeek,
  totalIncome,
  totalExpenses,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Cash */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Cash</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${currentCash < 0 ? 'text-red-600' : ''}`}>
            £{(currentCash / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Available balance
          </p>
        </CardContent>
      </Card>

      {/* Lowest Point */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lowest Point</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="m22 17-8.5-8.5L10 12l-4-4-6 6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${lowestPoint < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
            £{(lowestPoint / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">
            {lowestPointWeek}
          </p>
        </CardContent>
      </Card>

      {/* 13-Week Income */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projected Income</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="m16 6 4 4-4 4M8 18l-4-4 4-4M12 2v20" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            +£{(totalIncome / 100).toLocaleString('en-GB', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Next 13 weeks
          </p>
        </CardContent>
      </Card>

      {/* 13-Week Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projected Expenses</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            -£{(totalExpenses / 100).toLocaleString('en-GB', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-muted-foreground">
            Next 13 weeks
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
