import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export const createTRPCContext = async () => {
  const { userId } = await auth()

  return {
    userId,
    prisma,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const user = await ctx.prisma.user.findUnique({
    where: { clerkId: ctx.userId },
  })

  if (!user) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      user,
    },
  })
})
