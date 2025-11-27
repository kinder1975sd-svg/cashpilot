import Stripe from 'stripe'

// Lazy initialize to avoid build-time errors when env vars aren't set
let stripeInstance: Stripe | null = null

function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }

    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  }

  return stripeInstance
}

export const stripe = new Proxy({} as Stripe, {
  get: (_, prop) => {
    const client = getStripeClient()
    return (client as any)[prop]
  },
})
