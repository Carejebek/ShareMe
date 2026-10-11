import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Payment features will fail until configured.');
}

// STRIPE_API_BASE is only for local testing against a fake Stripe server (e.g. http://127.0.0.1:12111).
const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
  ...(base ? { host: base.hostname, port: Number(base.port) || 80, protocol: base.protocol.replace(':', '') as 'http' | 'https' } : {})
});
