'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface Scenario {
  id: string
  name: string
  type: 'income' | 'expense' | 'delay'
  amount?: number
  description: string
  weekOffset: number
  recurring: boolean
}

interface WeekData {
  weekLabel: string
  projected: number
  income: number
  expenses: number
}

interface ScenarioBuilderProps {
  baseWeeks: WeekData[]
  onApplyScenario: (weeks: WeekData[]) => void
}

export function ScenarioBuilder({ baseWeeks, onApplyScenario }: ScenarioBuilderProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newScenario, setNewScenario] = useState<Partial<Scenario>>({
    type: 'income',
    weekOffset: 0,
    recurring: false,
  })

  const addScenario = () => {
    if (!newScenario.name || !newScenario.amount) return

    const scenario: Scenario = {
      id: Date.now().toString(),
      name: newScenario.name,
      type: newScenario.type as 'income' | 'expense' | 'delay',
      amount: newScenario.amount,
      description: newScenario.description || '',
      weekOffset: newScenario.weekOffset || 0,
      recurring: newScenario.recurring || false,
    }

    setScenarios([...scenarios, scenario])
    setNewScenario({
      type: 'income',
      weekOffset: 0,
      recurring: false,
    })
    setShowForm(false)
  }

  const removeScenario = (id: string) => {
    setScenarios(scenarios.filter((s) => s.id !== id))
  }

  const applyScenarios = () => {
    // Create a copy of base weeks
    const modifiedWeeks = baseWeeks.map((week) => ({ ...week }))

    // Apply each scenario
    scenarios.forEach((scenario) => {
      if (scenario.recurring) {
        // Apply to all weeks from offset onwards
        for (let i = scenario.weekOffset; i < modifiedWeeks.length; i++) {
          applyScenarioToWeek(modifiedWeeks, i, scenario)
        }
      } else {
        // Apply to single week
        if (scenario.weekOffset < modifiedWeeks.length) {
          applyScenarioToWeek(modifiedWeeks, scenario.weekOffset, scenario)
        }
      }
    })

    // Recalculate running totals
    let runningCash = modifiedWeeks[0].projected
    for (let i = 1; i < modifiedWeeks.length; i++) {
      const netChange = modifiedWeeks[i].income - modifiedWeeks[i].expenses
      runningCash = modifiedWeeks[i - 1].projected + netChange
      modifiedWeeks[i].projected = runningCash
    }

    onApplyScenario(modifiedWeeks)
  }

  const applyScenarioToWeek = (weeks: WeekData[], index: number, scenario: Scenario) => {
    if (scenario.type === 'income') {
      weeks[index].income += scenario.amount! * 100 // Convert to pence
    } else if (scenario.type === 'expense') {
      weeks[index].expenses += scenario.amount! * 100
    } else if (scenario.type === 'delay') {
      // Move expense to later week
      if (index + 1 < weeks.length) {
        weeks[index].expenses -= scenario.amount! * 100
        weeks[index + 1].expenses += scenario.amount! * 100
      }
    }
  }

  const resetScenarios = () => {
    setScenarios([])
    onApplyScenario(baseWeeks)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What-If Scenarios</CardTitle>
        <CardDescription>
          Model different scenarios to see how they affect your cash flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active scenarios */}
        {scenarios.length > 0 && (
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{scenario.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {scenario.type === 'income' ? '+' : '-'}£{scenario.amount?.toLocaleString()}{' '}
                    in Week {scenario.weekOffset + 1}
                    {scenario.recurring && ' (recurring)'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScenario(scenario.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add scenario form */}
        {showForm ? (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Scenario Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., New contract"
                  value={newScenario.name || ''}
                  onChange={(e) =>
                    setNewScenario({ ...newScenario, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={newScenario.type}
                  onChange={(e) =>
                    setNewScenario({
                      ...newScenario,
                      type: e.target.value as 'income' | 'expense' | 'delay',
                    })
                  }
                >
                  <option value="income">New Income</option>
                  <option value="expense">New Expense</option>
                  <option value="delay">Delay Payment</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (£)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="5000"
                  value={newScenario.amount || ''}
                  onChange={(e) =>
                    setNewScenario({
                      ...newScenario,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="week">Starting Week</Label>
                <Select
                  id="week"
                  value={newScenario.weekOffset?.toString()}
                  onChange={(e) =>
                    setNewScenario({
                      ...newScenario,
                      weekOffset: parseInt(e.target.value),
                    })
                  }
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i}>
                      Week {i + 1}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={newScenario.recurring}
                onChange={(e) =>
                  setNewScenario({ ...newScenario, recurring: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="recurring">Recurring weekly</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={addScenario}>Add Scenario</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            + Add Scenario
          </Button>
        )}

        {/* Apply/Reset buttons */}
        {scenarios.length > 0 && (
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={applyScenarios}>Apply Scenarios</Button>
            <Button variant="outline" onClick={resetScenarios}>
              Reset to Baseline
            </Button>
          </div>
        )}

        {/* Quick scenarios */}
        {scenarios.length === 0 && !showForm && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">Quick scenarios:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScenarios([
                    {
                      id: '1',
                      name: 'Delay payroll 1 week',
                      type: 'delay',
                      amount: 45000,
                      description: '',
                      weekOffset: 0,
                      recurring: false,
                    },
                  ])
                }}
              >
                Delay Payroll
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScenarios([
                    {
                      id: '2',
                      name: 'Win new contract',
                      type: 'income',
                      amount: 15000,
                      description: '',
                      weekOffset: 2,
                      recurring: true,
                    },
                  ])
                }}
              >
                New Contract
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScenarios([
                    {
                      id: '3',
                      name: 'Emergency expense',
                      type: 'expense',
                      amount: 10000,
                      description: '',
                      weekOffset: 1,
                      recurring: false,
                    },
                  ])
                }}
              >
                Emergency Cost
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
