import { API_BASE_URL } from '../config';
import { api } from './authService';

// Ticket Types
export const getTicketTypes = async (eventId) => {
  try {
    // Use the Gallery app's endpoint to get tickets for an event
    const response = await api.get(`/api/gallery/events/${eventId}/tickets/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    throw error;
  }
};

// Create Paystack Payment
/**
 * Creates a Paystack payment for ticket purchase
 * @param {string} eventId - The ID of the event
 * @param {string} ticketTypeId - The ID of the ticket type
 * @param {number} quantity - Number of tickets to purchase
 * @param {string} [paymentMethod='card'] - Payment method ('card', 'bank_transfer', 'ussd', 'mobile_money', 'bank', 'cash', 'pay_on_venue')
 * @returns {Promise<Object>} Payment details including payment URL and reference
 */
export const createPaymentIntent = async (eventId, ticketTypeId, quantity = 1, paymentMethod = 'card') => {
  try {
    console.log('Creating Paystack payment...', { 
      eventId, 
      ticketTypeId,
      quantity,
      endpoint: '/api/tickets/create-payment-intent/'
    });
    
    if (!eventId || !ticketTypeId) {
      throw new Error('Event ID and Ticket Type ID are required');
    }
    
    // For cash payments, return a mock response
    if (paymentMethod === 'cash' || paymentMethod === 'pay_on_venue') {
      console.log('Skipping payment creation for cash/on-venue payment');
      return {
        payment_method: paymentMethod,
        reference: `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: 0, // Will be set by the backend
        currency: 'NGN',
        status: 'success',
        payment_url: null
      };
    }
    
    // For Paystack payments
    const response = await api.post(
      '/api/tickets/create-payment-intent/',
      { 
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity: parseInt(quantity, 10) || 1
      },
      { 
        validateStatus: status => status < 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Paystack payment response status:', response.status);
    console.log('Response data:', response.data);
    
    if (response.status >= 400) {
      const errorMessage = response.data?.error || 
                         response.data?.message ||
                         'Failed to create payment';
      const error = new Error(errorMessage);
      error.response = response;
      throw error;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error in createPaymentIntent:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        data: error.config?.data
      }
    });
    
    // Re-throw with a more user-friendly message if needed
    if (error.response) {
      // Handle different status codes with appropriate messages
      if (error.response.status === 400) {
        throw new Error('Invalid request. Please check your input and try again.');
      } else if (error.response.status === 401) {
        throw new Error('Please log in to continue with your purchase.');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to perform this action.');
      } else if (error.response.status === 404) {
        throw new Error('The requested ticket type was not found.');
      }
    }
    
    // For other errors, use the original error message or a generic one
    throw new Error(error.message || 'An error occurred while processing your payment. Please try again.');
  }
};

/**
 * Purchase a ticket using Paystack or cash payment
 * @param {string} eventId - The ID of the event
 * @param {string} ticketTypeId - The ID of the ticket type
 * @param {number} quantity - Number of tickets to purchase
 * @param {string} paymentMethod - Payment method ('card', 'bank_transfer', 'ussd', 'mobile_money', 'bank', 'cash', 'pay_on_venue')
 * @param {string} [reference] - Payment reference from Paystack (required for online payments)
 * @returns {Promise<Object>} The purchase result
 */
export const purchaseTicket = async (eventId, ticketTypeId, quantity = 1, paymentMethod = 'card', reference = null) => {
  try {
    if (!eventId || !ticketTypeId) {
      throw new Error('Event ID and Ticket Type ID are required');
    }
    
    // For cash payments, generate a reference if not provided
    if ((paymentMethod === 'cash' || paymentMethod === 'pay_on_venue') && !reference) {
      reference = `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // For online payments, reference is required
    if (paymentMethod === 'card' && !reference) {
      throw new Error('Payment reference is required for online payments');
    }
    
    console.log('Processing ticket purchase...', { 
      eventId, 
      ticketTypeId, 
      quantity, 
      paymentMethod, 
      reference 
    });
    
    const requestData = {
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantity: parseInt(quantity, 10) || 1,
      payment_method: paymentMethod,
      reference: reference
    };
    
    const response = await api.post(
      '/api/tickets/purchase/',
      requestData,
      {
        validateStatus: status => status < 500 // Don't throw for 4xx errors
      }
    );
    
    console.log('Purchase response status:', response.status);
    console.log('Purchase response data:', response.data);
    
    // Handle error responses
    if (response.status >= 400) {
      const errorMessage = response.data?.error?.message || 
                         response.data?.message ||
                         response.data?.detail ||
                         'Failed to process ticket purchase';
      const error = new Error(errorMessage);
      error.response = response;
      throw error;
    }
    
    return response.data;
  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      response: {
        data: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        statusText: error.response?.statusText,
        config: error.response?.config
      },
      request: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        headers: error.config?.headers,
        params: error.config?.params,
        baseURL: error.config?.baseURL
      },
      stack: error.stack
    };
    
    console.error('Error in purchaseTicket:', JSON.stringify(errorDetails, null, 2));
    
    // Re-throw with a more user-friendly message if needed
    if (error.response) {
      // Handle different status codes with appropriate messages
      if (error.response.status === 400) {
        // Extract validation errors if they exist
        const errorData = error.response.data;
        let errorMessage = 'Invalid request. Please check your input and try again.';
        
        if (errorData) {
          // Handle different formats of validation errors
          if (typeof errorData === 'object') {
            // Handle Django REST framework validation errors
            if (errorData.non_field_errors) {
              errorMessage = errorData.non_field_errors.join(' ');
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else {
              // Convert field-specific errors to a readable string
              const fieldErrors = Object.entries(errorData)
                .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(' ') : errors}`)
                .join('\n');
              if (fieldErrors) errorMessage = fieldErrors;
            }
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        }
        
        throw new Error(errorMessage);
      } else if (error.response.status === 401) {
        throw new Error('Please log in to complete your purchase.');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to perform this action.');
      } else if (error.response.status === 404) {
        throw new Error('The requested ticket type was not found.');
      } else if (error.response.status === 409) {
        throw new Error('This ticket is no longer available. Please refresh the page and try again.');
      }
    }
    
    // For other errors, use the original error message or a generic one
    throw new Error(error.message || 'An error occurred while processing your ticket purchase. Please try again.');
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
    const response = await api.post(
      '/api/tickets/verify/',
      { verification_code: verificationCode }
    );
    return response.data;
  } catch (error) {
    console.error('Error verifying ticket:', error);
    throw error;
  }
};
