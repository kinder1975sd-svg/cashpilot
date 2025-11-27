import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'
import { webhookRateLimiter, rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req, webhookRateLimiter)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    logger.warn('Stripe webhook received without signature')
    return new NextResponse('Missing signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Use any to bypass Stripe's inconsistent TypeScript types
        const session: any = event.data.object

        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id

          const subscription: any = await stripe.subscriptions.retrieve(subscriptionId)

          const userId = subscription.metadata.userId
          const plan = subscription.metadata.plan

          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: subscription.id,
              plan: plan,
              planStatus: 'active',
              subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription: any = event.data.object
        const userId = subscription.metadata.userId

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              planStatus: subscription.status === 'active' ? 'active' : subscription.status,
              subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription: any = event.data.object
        const userId = subscription.metadata.userId

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: 'FREE',
              planStatus: 'canceled',
              stripeSubscriptionId: null,
              subscriptionEndsAt: null,
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice: any = event.data.object

        if (invoice.subscription) {
          const subscriptionId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id

          const subscription: any = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata.userId

          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                planStatus: 'past_due',
              },
            })
          }
        }
        break
      }
    }

    logger.info('Stripe webhook processed successfully', { eventType: event.type })
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    logger.error('Stripe webhook handler error', error, { eventType: event?.type })
    return new NextResponse('Webhook handler failed', { status: 500 })
  }
}
