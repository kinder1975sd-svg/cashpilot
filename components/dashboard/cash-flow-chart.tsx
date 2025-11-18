'use client'

import { Card } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface WeekData {
  weekLabel: string
  projected: number
  income: number
  expenses: number
}

interface CashFlowChartProps {
  weeks: WeekData[]
  buffer: number
}

export function CashFlowChart({ weeks, buffer }: CashFlowChartProps) {
  // Format data for the chart
  const chartData = weeks.map((week) => ({
    ...week,
    projectedDisplay: week.projected / 100, // Convert pence to pounds
  }))

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">13-Week Cash Flow Forecast</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={(value) =>
              `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
            }
          />
          <Tooltip
            formatter={(value: number) =>
              `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
            }
            labelStyle={{ color: '#000' }}
          />
          <ReferenceLine
            y={buffer / 100}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{
              value: 'Safety Buffer',
              position: 'right',
              fill: '#ef4444',
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="projectedDisplay"
            fill="#3b82f6"
            name="Projected Cash"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
