import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { generateForecast } from '@/lib/forecasting'
import { syncXeroTransactions } from '@/lib/xero-sync'

export const forecastRouter = router({
  // Get current forecast
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const forecast = await ctx.prisma.forecast.findFirst({
      where: { userId: ctx.user.id, isActive: true },
    })

    if (!forecast) {
      return null
    }

    return {
      id: forecast.id,
      weeks: forecast.weeks as {
        weekStart: string
        weekEnd: string
        weekLabel: string
        projected: number
        income: number
        expenses: number
      }[],
      generatedAt: forecast.generatedAt,
    }
  }),

  // Regenerate forecast
  regenerate: protectedProcedure.mutation(async ({ ctx }) => {
    // Sync latest transactions first
    if (ctx.user.xeroAccessToken) {
      await syncXeroTransactions(ctx.user.id)
    }

    // Generate new forecast
    const result = await generateForecast(ctx.user.id)
    return result
  }),

  // Get alerts
  getAlerts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.alert.findMany({
      where: { userId: ctx.user.id, dismissed: false },
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Dismiss alert
  dismissAlert: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.alert.update({
        where: { id: input.alertId, userId: ctx.user.id },
        data: { dismissed: true, dismissedAt: new Date() },
      })
      return { success: true }
    }),

  // Update cash buffer
  updateCashBuffer: protectedProcedure
    .input(z.object({ buffer: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { cashBuffer: input.buffer },
      })

      // Regenerate alerts with new buffer
      await generateForecast(ctx.user.id)

      return { success: true }
    }),
})
