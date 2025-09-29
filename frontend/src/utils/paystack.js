import { loadScript } from './loadScript';

// Grab Paystack public key from environment
const PAYSTACK_PUBLIC_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

// Validate the key early
if (!PAYSTACK_PUBLIC_KEY) {
  throw new Error(
    'Paystack public key is not set. Please define REACT_APP_PAYSTACK_PUBLIC_KEY in your .env file.'
  );
}

/**
 * Ensure Paystack script is loaded
 */
const ensurePaystackScript = async () => {
  if (window.PaystackPop) return;

  await loadScript('https://js.paystack.co/v1/inline.js');

  if (!window.PaystackPop) {
    throw new Error('Failed to load Paystack script.');
  }
};

/**
 * Process payment with Paystack
 * @param {Object} options
 * @param {string} options.email - Customer email
 * @param {number} options.amount - Amount in base currency (KES)
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} [options.onClose] - Close callback
 * @param {Object} [options.metadata] - Extra payment metadata
 */
export const processPaystackPayment = async ({
  email,
  amount,
  onSuccess,
  onClose,
  metadata = {},
}) => {
  if (!email) throw new Error('Email is required for payment.');
  if (!amount || isNaN(amount) || amount <= 0)
    throw new Error(`Invalid amount: ${amount}`);
  if (typeof onSuccess !== 'function')
    throw new Error('onSuccess callback is required.');

  await ensurePaystackScript();

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: formatAmount(amount),
    currency: 'KES',
    ref: `TXN-${Date.now()}`,
    metadata,
    callback: (response) => {
      if (response.status === 'success') {
        onSuccess(response);
      } else {
        console.error('Paystack payment failed:', response);
      }
    },
    onClose: () => {
      if (typeof onClose === 'function') onClose();
    },
  });

  handler.openIframe();
};

/**
 * Convert amount to smallest currency unit (kobo/pesewas)
 * @param {number|string} amount
 * @returns {number}
 */
export const formatAmount = (amount) => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return Math.round(parsed * 100);
};
