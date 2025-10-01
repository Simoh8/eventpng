import { API_BASE_URL } from '../config';
import { api } from './authService';

// Ticket Types
export const getTicketTypes = async (eventId) => {
  try {
    const response = await api.get(`/api/gallery/events/${eventId}/tickets/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    throw error;
  }
};

// Create Paystack Payment
export const createPaymentIntent = async (
  eventId,
  ticketTypeId,
  quantity = 1,
  paymentMethod = 'card'
) => {
  try {
    if (!eventId || !ticketTypeId) {
      throw new Error('Event ID and Ticket Type ID are required');
    }

    // Handle cash / pay on venue locally
    if (paymentMethod === 'cash' || paymentMethod === 'pay_on_venue') {
      return {
        payment_method: paymentMethod,
        reference: `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: 0,
        currency: 'NGN',
        status: 'success',
        payment_url: null
      };
    }

    // For Paystack / online payments
    const response = await api.post(
      '/api/tickets/create-payment-intent/',
      {
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity: parseInt(quantity, 10) || 1
      },
      {
        validateStatus: status => status < 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (response.status >= 400) {
      const errorMessage =
        response.data?.error ||
        response.data?.message ||
        'Failed to create payment';
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error) {
    console.error('Error in createPaymentIntent:', error.response?.data || error.message);
    throw new Error(
      error.message ||
        'An error occurred while creating the payment. Please try again.'
    );
  }
};

// Purchase Ticket
export const purchaseTicket = async (
  eventId,
  ticketTypeId,
  quantity = 1,
  paymentMethod = 'card',
  reference = null
) => {
  try {
    if (!eventId || !ticketTypeId) {
      throw new Error('Event ID and Ticket Type ID are required');
    }

    if ((paymentMethod === 'cash' || paymentMethod === 'pay_on_venue') && !reference) {
      reference = `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (paymentMethod === 'card' && !reference) {
      throw new Error('Payment reference is required for online payments');
    }

    const response = await api.post(
      '/api/tickets/purchase/',
      {
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity: parseInt(quantity, 10) || 1,
        payment_method: paymentMethod,
        reference
      },
      { validateStatus: status => status < 500 }
    );

    if (response.status >= 400) {
      const errorMessage =
        response.data?.error?.message ||
        response.data?.message ||
        response.data?.detail ||
        'Failed to process ticket purchase';
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error) {
    console.error('Error in purchaseTicket:', error.response?.data || error.message);
    throw new Error(
      error.message ||
        'An error occurred while processing your ticket purchase. Please try again.'
    );
  }
};

// Get User Tickets
export const getUserTickets = async () => {
  try {
    const response = await api.get('/api/tickets/my-tickets/');
    return response.data;
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    throw error;
  }
};

// Get Ticket Details
export const getTicket = async (ticketId) => {
  try {
    const response = await api.get(`/api/tickets/my-tickets/${ticketId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ticket ${ticketId}:`, error);
    throw error;
  }
};

// Verify Ticket
export const verifyTicket = async (verificationCode) => {
  try {
    const response = await api.post('/api/tickets/verify/', {
      verification_code: verificationCode
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying ticket:', error);
    throw error;
  }
};
