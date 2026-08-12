import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil' as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new NextResponse('No signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Use the service role key to bypass RLS and update the subscriptions table
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (checkoutSession.client_reference_id) {
          await supabaseAdmin.from('subscriptions').upsert({
            user_id: checkoutSession.client_reference_id,
            stripe_customer_id: checkoutSession.customer as string,
            status: 'active',
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('subscriptions').update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          price_id: subscription.items.data[0].price.id,
        }).eq('stripe_customer_id', subscription.customer as string);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (dbError) {
    console.error('Database update failed:', dbError);
    return new NextResponse('Database Error', { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
