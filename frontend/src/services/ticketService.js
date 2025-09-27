import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const createTicket = async (ticketData) => {
  try {
    const response = await axios.post(`${API_URL}/tickets/`, ticketData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

export const getTicket = async (ticketId) => {
  try {
    const response = await axios.get(`${API_URL}/tickets/${ticketId}/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    throw error;
  }
};
