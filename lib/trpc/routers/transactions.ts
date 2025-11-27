import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const transactionsRouter = router({
  // Get paginated transactions
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(), // Transaction ID for cursor-based pagination
        type: z.enum(['INCOME', 'EXPENSE']).optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, type, search, startDate, endDate } = input

      // Build where clause
      const where: any = {
        userId: ctx.user.id,
      }

      if (type) {
        where.type = type
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { contact: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (startDate || endDate) {
        where.date = {}
        if (startDate) where.date.gte = startDate
        if (endDate) where.date.lte = endDate
      }

      // Fetch transactions with cursor-based pagination
      const transactions = await ctx.prisma.transaction.findMany({
        where,
        take: limit + 1, // Take one extra to determine if there are more
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          amount: true,
          type: true,
          description: true,
          category: true,
          contact: true,
          source: true,
          createdAt: true,
        },
      })

      // Determine if there are more results
      let nextCursor: string | undefined = undefined
      if (transactions.length > limit) {
        const nextItem = transactions.pop()
        nextCursor = nextItem!.id
      }

      return {
        transactions,
        nextCursor,
      }
    }),

  // Get transaction statistics
  getStats: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date()
      since.setMonth(since.getMonth() - input.months)

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: since },
        },
        select: {
          amount: true,
          type: true,
          date: true,
        },
      })

      const income = transactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

      const expenses = transactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

      const net = income - expenses
      const count = transactions.length

      // Group by month for chart data
      const byMonth = transactions.reduce((acc: any, t: any) => {
        const monthKey = t.date.toISOString().slice(0, 7) // YYYY-MM
        if (!acc[monthKey]) {
          acc[monthKey] = { income: 0, expenses: 0 }
        }
        if (t.type === 'INCOME') {
          acc[monthKey].income += t.amount
        } else {
          acc[monthKey].expenses += t.amount
        }
        return acc
      }, {} as Record<string, { income: number; expenses: number }>)

      return {
        totalIncome: income,
        totalExpenses: expenses,
        netCashFlow: net,
        transactionCount: count,
        averageIncome: income / input.months,
        averageExpenses: expenses / input.months,
        byMonth: Object.entries(byMonth).map(([month, data]: [string, any]) => ({
          month,
          income: data.income,
          expenses: data.expenses,
          net: data.income - data.expenses,
        })),
      }
    }),

  // Get single transaction
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.transaction.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      })
    }),
})
