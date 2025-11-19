'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ConnectAccounting() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleDemo = async () => {
    setIsLoading(true)
    setLoadingAction('demo')

    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })

      if (response.ok) {
        window.location.href = '/dashboard?demo=connected'
      } else {
        alert('Failed to generate demo data')
      }
    } catch (error) {
      console.error('Demo error:', error)
      alert('Failed to generate demo data')
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
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
          <h1 className="text-2xl font-bold mb-2">Connect Your Accounting Software</h1>
          <p className="text-muted-foreground">
            CashPilot needs access to your transactions to generate accurate 13-week
            cash flow forecasts. Your data is encrypted and secure.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Xero */}
          <Card className="hover:border-blue-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#13B5EA] rounded flex items-center justify-center text-white font-bold">
                  X
                </div>
                <div>
                  <CardTitle className="text-lg">Xero</CardTitle>
                  <CardDescription>Cloud accounting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <a href="/api/xero/connect">Connect Xero</a>
              </Button>
            </CardContent>
          </Card>

          {/* QuickBooks */}
          <Card className="hover:border-green-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2CA01C] rounded flex items-center justify-center text-white font-bold">
                  Q
                </div>
                <div>
                  <CardTitle className="text-lg">QuickBooks</CardTitle>
                  <CardDescription>Small business accounting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <a href="/api/quickbooks/connect">Connect QuickBooks</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Demo Mode */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Try Demo Mode</CardTitle>
            <CardDescription>
              Don&apos;t have accounting software connected? Try CashPilot with realistic
              sample data to see how it works.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleDemo}
              disabled={isLoading}
            >
              {loadingAction === 'demo' ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating demo data...
                </>
              ) : (
                'Load Demo Data'
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          We use read-only access. CashPilot never modifies your accounting data.
        </p>
      </div>
    </div>
  )
}
