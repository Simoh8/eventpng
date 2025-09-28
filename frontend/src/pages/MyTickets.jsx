import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, CardMedia, Chip,
  CircularProgress, Container, Divider, Grid, Typography, Paper
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { getUserTickets } from '../services/ticketService';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getUserTickets();
        setTickets(data);
      } catch (err) {
        setError('Failed to load your tickets');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Container>
    );
  }

  if (tickets.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <EventIcon color="action" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" gutterBottom>No Tickets Found</Typography>
        <Typography color="textSecondary" paragraph>You haven't purchased any tickets yet.</Typography>
        <Button variant="contained" onClick={() => navigate('/events')}>
          Browse Events
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>My Tickets</Typography>
      
      <Grid container spacing={3}>
        {tickets.map((ticket) => (
          <Grid item xs={12} key={ticket.id}>
            <Card elevation={3}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    {ticket.ticket_type?.event?.image ? (
                      <CardMedia
                        component="img"
                        height="200"
                        image={ticket.ticket_type.event.image}
                        alt={ticket.ticket_type.event.title}
                        sx={{ borderRadius: 1 }}
                      />
                    ) : (
                      <Box height={200} display="flex" alignItems="center" 
                        justifyContent="center" bgcolor="action.hover" borderRadius={1}>
                        <EventIcon color="action" sx={{ fontSize: 60 }} />
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={5}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {ticket.ticket_type?.event?.title || 'Event'}
                    </Typography>
                    
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="textSecondary">Ticket Type</Typography>
                      <Typography>{ticket.ticket_type?.name || 'General Admission'}</Typography>
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="textSecondary">Event Date</Typography>
                      <Typography>
                        {ticket.ticket_type?.event?.date 
                          ? new Date(ticket.ticket_type.event.date).toLocaleDateString() 
                          : 'Date not specified'}
                      </Typography>
                    </Box>
                    
                    <Button 
                      variant="outlined" 
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      sx={{ mt: 2 }}
                    >
                      View Details
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                        <Chip 
                          label={ticket.status || 'Unknown'}
                          color={
                            ticket.status?.toLowerCase() === 'confirmed' ? 'success' : 
                            ticket.status?.toLowerCase() === 'pending' ? 'warning' : 'default'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Quantity</Typography>
                        <Typography>{ticket.quantity}</Typography>
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="subtitle2" color="textSecondary">Total</Typography>
                        <Typography variant="subtitle1" fontWeight="bold">
                          ${ticket.total_price?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default MyTickets;
