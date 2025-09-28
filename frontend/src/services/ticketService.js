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

// Create Payment Intent
export const createPaymentIntent = async (eventTicketId, quantity, paymentMethod = 'card') => {
  try {
    console.log('Sending request to create payment intent...', { 
      eventTicketId, 
      quantity,
      paymentMethod,
      endpoint: '/api/tickets/create-payment-intent/'
    });
    
    if (!eventTicketId) {
      throw new Error('Event ticket ID is required');
    }
    
    const response = await api.post(
      '/api/tickets/create-payment-intent/',
      { 
        event_ticket_id: eventTicketId, 
        quantity: parseInt(quantity, 10) || 1,
        payment_method: paymentMethod
      },
      { 
        validateStatus: status => status < 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Payment intent response status:', response.status);
    console.log('Response data:', response.data);
    
    if (response.status >= 400) {
      const errorMessage = response.data?.detail || 
                         response.data?.error?.message ||
                         response.data?.message ||
                         'Failed to create payment intent';
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

// Purchase Ticket
export const purchaseTicket = async (eventTicketId, quantity, paymentMethod, paymentIntentId) => {
  try {
    if (!eventTicketId) {
      throw new Error('Please select a valid event ticket');
    }
    
    if (!paymentIntentId) {
      throw new Error('Payment intent ID is required');
    }
    
    console.log('Sending purchase request...', { 
      eventTicketId, 
      quantity, 
      paymentMethod, 
      paymentIntentId 
    });
    
    const response = await api.post(
      '/api/tickets/purchase/',
      {
        event_ticket_id: eventTicketId,
        quantity: parseInt(quantity, 10),
        payment_method: paymentMethod,
        payment_intent_id: paymentIntentId
      },
      {
        validateStatus: status => status < 500 // Don't throw for 4xx errors
      }
    );
    
    console.log('Purchase response status:', response.status);
    console.log('Purchase response data:', response.data);
    
    // Handle error responses
    if (response.status >= 400) {
      const errorMessage = response.data?.detail || 
                         response.data?.error?.message ||
                         response.data?.message ||
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
