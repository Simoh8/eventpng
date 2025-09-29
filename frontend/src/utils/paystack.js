import { loadScript } from './loadScript';

const PAYSTACK_PUBLIC_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

// Initialize Paystack
const initializePaystack = async () => {
  try {
    // Load Paystack script if not already loaded
    if (!window.PaystackPop) {
      await loadScript('https://js.paystack.co/v1/inline.js');
    }
    return window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      currency: 'KES',
      ref: `TXN-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error initializing Paystack:', error);
    throw error;
  }
};

// Process payment with Paystack
export const processPaystackPayment = async ({ 
  email, 
  amount, 
  onSuccess, 
  onClose, 
  metadata = {} 
}) => {
  try {
    const paystack = await initializePaystack();
    
    paystack.openIframe({
      email,
      amount: amount * 100, // Convert to kobo/pesewas
      metadata,
      callback: function(response) {
        // Verify the transaction
        if (response.status === 'success') {
          onSuccess(response);
        }
      },
      onClose: function() {
        if (onClose) onClose();
      },
    });
  } catch (error) {
    console.error('Paystack payment error:', error);
    throw error;
  }
};

// Format amount to kobo/pesewas (smallest currency unit)
export const formatAmount = (amount) => {
  return Math.round(parseFloat(amount) * 100);
};
