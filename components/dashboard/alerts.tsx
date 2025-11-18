'use client'

import { Card } from '@/components/ui/card'

interface Alert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  actionUrl: string | null
}

interface AlertsProps {
  alerts: Alert[]
}

export function Alerts({ alerts }: AlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={`p-4 border-l-4 ${
            alert.severity === 'critical'
              ? 'border-l-red-500 bg-red-50'
              : 'border-l-yellow-500 bg-yellow-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                alert.severity === 'critical'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}
            >
              {alert.severity === 'critical' ? '!' : '⚠'}
            </div>
            <div>
              <h3 className="font-semibold">{alert.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              {alert.actionUrl && (
                <a
                  href={alert.actionUrl}
                  className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                >
                  Take action →
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
