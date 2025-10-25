import { db } from '@/db'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import type Stripe from 'stripe'

// ✅ Extend the Invoice type to include subscription
interface StripeInvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription | null
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get('Stripe-Signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(
      `Webhook Error: ${
        err instanceof Error ? err.message : 'Unknown Error'
      }`,
      { status: 400 }
    )
  }

  try {
    // ✅ Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (!session?.metadata?.userId || !session.subscription) {
        return new Response(null, { status: 200 })
      }

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      )

      // ✅ Get current_period_end from subscription items
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end

      if (!currentPeriodEnd) {
        console.error('No current_period_end found in subscription items')
        return new Response(null, { status: 200 })
      }

      await db.user.update({
        where: {
          id: session.metadata.userId,
        },
        data: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0]?.price.id,
          stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
        },
      })

      console.log('✅ Subscription created for user:', session.metadata.userId)
    }

    // ✅ Handle invoice.payment_succeeded
    if (event.type === 'invoice.payment_succeeded') {
      // ✅ Use extended type
      const invoice = event.data.object as StripeInvoiceWithSubscription

      // Extract subscription ID
      const subscriptionId = 
        typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id

      if (!subscriptionId) {
        return new Response(null, { status: 200 })
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      // ✅ Get current_period_end from subscription items
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end

      if (!currentPeriodEnd) {
        console.error('No current_period_end found in subscription items')
        return new Response(null, { status: 200 })
      }

      await db.user.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          stripePriceId: subscription.items.data[0]?.price.id,
          stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
        },
      })

      console.log('✅ Subscription renewed:', subscription.id)
    }
  } catch (error) {
    console.error('Error handling webhook:', error)
    return new Response(
      `Webhook handler failed: ${
        error instanceof Error ? error.message : 'Unknown Error'
      }`,
      { status: 500 }
    )
  }

  return new Response(null, { status: 200 })
}