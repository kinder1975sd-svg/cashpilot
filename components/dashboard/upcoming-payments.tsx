'use client'

import { Card } from '@/components/ui/card'

interface UpcomingPaymentsProps {
  userId: string
}

export function UpcomingPayments({ userId }: UpcomingPaymentsProps) {
  // In production, this would fetch upcoming bills from the database
  const upcomingPayments = [
    {
      id: '1',
      description: 'Monthly Payroll',
      amount: 4500000, // in pence
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      category: 'payroll',
    },
    {
      id: '2',
      description: 'Office Rent',
      amount: 250000,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      category: 'rent',
    },
    {
      id: '3',
      description: 'VAT Payment',
      amount: 180000,
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      category: 'tax',
    },
  ]

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Upcoming Payments</h2>
      <div className="space-y-4">
        {upcomingPayments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-3 border-b last:border-b-0"
          >
            <div>
              <p className="font-medium">{payment.description}</p>
              <p className="text-sm text-muted-foreground">
                Due:{' '}
                {payment.dueDate.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-red-600">
                -£{(payment.amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                {payment.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
