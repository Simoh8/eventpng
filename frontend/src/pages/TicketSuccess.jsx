import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, CircularProgress, Paper, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getTicket } from '../services/ticketService';

const TicketSuccess = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await getTicket(ticketId);
        setTicket(data);
      } catch (err) {
        setError('Failed to load ticket details');
        console.error('Error fetching ticket:', err);
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    } else {
      setLoading(false);
      setError('No ticket ID provided');
    }
  }, [ticketId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !ticket) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error || 'Ticket not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          Thank You for Your Purchase!
        </Typography>
        
        <Typography variant="h6" color="textSecondary" paragraph>
          Your ticket for <strong>{ticket.ticket_type?.event?.title}</strong> has been successfully purchased.
        </Typography>
        
        <Paper variant="outlined" sx={{ p: 3, my: 3, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            Order Confirmation
          </Typography>
          
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary">Order #</Typography>
            <Typography>{ticket.id}</Typography>
          </Box>
          
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary">Event</Typography>
            <Typography>{ticket.ticket_type?.event?.title}</Typography>
          </Box>
          
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary">Ticket Type</Typography>
            <Typography>{ticket.ticket_type?.name}</Typography>
          </Box>
          
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary">Quantity</Typography>
            <Typography>{ticket.quantity}</Typography>
          </Box>
          
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary">Total Amount</Typography>
            <Typography>${ticket.total_price?.toFixed(2)}</Typography>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography color={ticket.payment_method === 'cash' ? 'warning.main' : 'success.main'} fontWeight="bold">
            {ticket.payment_method === 'cash' 
              ? 'Please pay at the venue' 
              : 'Payment successful!'}
          </Typography>
          
          {ticket.qr_code && (
            <Box mt={3} textAlign="center">
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Your Ticket QR Code
              </Typography>
              <img 
                src={ticket.qr_code} 
                alt="Ticket QR Code" 
                style={{ maxWidth: '200px', height: 'auto' }} 
              />
              <Typography variant="caption" display="block" mt={1}>
                Show this code at the event entrance
              </Typography>
            </Box>
          )}
        </Paper>
        
        <Box mt={4} display="flex" justifyContent="center" gap={2}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => window.print()}
            sx={{ mt: 2 }}
          >
            Print Ticket
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Back to Home
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TicketSuccess;

