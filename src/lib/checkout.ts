import { ApiClient, type CheckoutOrder, type SubscriptionView } from './apiClient';

/**
 * Online payment flow. The server decides whether a real Razorpay order is used (keys configured) or
 * the payment is simulated; the UI is the same either way.
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (r: unknown) => void) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the payment gateway. Check your connection or ad-blocker.'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface PayOptions {
  amount?: number;
  type?: string;
  bookingId?: string;
  /** Pay an existing pending payment (e.g. a token fee) instead of creating a new one. */
  paymentId?: string;
  /** Used only for simulated payments. */
  paymentMethod?: string;
}

/** Runs the whole checkout and resolves with the paid payment record. Rejects on cancel/failure. */
export async function payOnline(options: PayOptions): Promise<any> {
  const order: CheckoutOrder = await ApiClient.tenant.checkout({
    amount: options.amount,
    type: options.type,
    bookingId: options.bookingId,
    paymentId: options.paymentId,
  });

  if (order.simulated) {
    return ApiClient.tenant.completeCheckout({
      paymentId: order.paymentId,
      paymentMethod: options.paymentMethod || 'UPI / GPay',
    });
  }

  await loadRazorpay();
  if (!window.Razorpay) throw new Error('Payment gateway unavailable.');

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: 'NestIn',
      description: order.description,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: '#0f172a' },
      modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        ApiClient.tenant
          .completeCheckout({ paymentId: order.paymentId, ...response })
          .then(resolve)
          .catch(reject);
      },
    });
    rzp.on('payment.failed', (r: unknown) =>
      reject(new Error((r as { error?: { description?: string } })?.error?.description || 'Payment failed.'))
    );
    rzp.open();
  });
}

/** Owner subscription upgrade/renewal — same gateway handshake as tenant payments. */
export async function paySubscription(plan: string, interval: 'monthly' | 'yearly'): Promise<SubscriptionView> {
  const order = await ApiClient.billing.checkout({ plan, interval });
  if (order.simulated) return ApiClient.billing.completeCheckout({ invoiceId: order.invoiceId });

  await loadRazorpay();
  if (!window.Razorpay) throw new Error('Payment gateway unavailable.');
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: 'NestIn',
      description: order.description,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: '#0f172a' },
      modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        ApiClient.billing
          .completeCheckout({ invoiceId: order.invoiceId, ...response })
          .then(resolve)
          .catch(reject);
      },
    });
    rzp.on('payment.failed', (r: unknown) =>
      reject(new Error((r as { error?: { description?: string } })?.error?.description || 'Payment failed.'))
    );
    rzp.open();
  });
}

/** Owner add-on purchase (verification visit / featured placement). Same flow as the subscription. */
export async function payAddon(data: {
  type: 'verification' | 'featured';
  propertyId: string;
  months?: number;
}): Promise<any> {
  const order = await ApiClient.billing.addonCheckout(data);
  if (order.simulated) return ApiClient.billing.completeAddonCheckout({ orderId: order.orderId });

  await loadRazorpay();
  if (!window.Razorpay) throw new Error('Payment gateway unavailable.');
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: 'NestIn',
      description: order.description,
      order_id: order.gatewayOrderId,
      prefill: order.prefill,
      theme: { color: '#0f172a' },
      modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        ApiClient.billing
          .completeAddonCheckout({ orderId: order.orderId, ...response })
          .then(resolve)
          .catch(reject);
      },
    });
    rzp.on('payment.failed', (r: unknown) =>
      reject(new Error((r as { error?: { description?: string } })?.error?.description || 'Payment failed.'))
    );
    rzp.open();
  });
}
