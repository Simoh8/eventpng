import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Heading, Button, Stack, useColorModeValue, CircularProgress } from '@chakra-ui/react';
import { getUserTickets } from '../services/ticketService';
import TicketCard from '../components/Tickets/TicketCard';
import NoTickets from '../components/Tickets/NoTickets';
import { Text } from '@chakra-ui/react';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const secondaryText = useColorModeValue('gray.600', 'gray.300');
  const sidePanelBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await getUserTickets();
        // Ensure we're working with an array
        const ticketsData = Array.isArray(response) ? response : (response.results || response.data || []);
        setTickets(ticketsData);
      } catch (err) {
        setError('Failed to load your tickets');
        console.error('Error:', err);
        setTickets([]); // Ensure tickets is always an array
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={8}>
        <CircularProgress isIndeterminate color="teal.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxW="container.md" py={8}>
        <Text color="red.500" fontSize="xl" mb={4}>
          {error}
        </Text>
        <Button colorScheme="teal" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Container>
    );
  }

  if (tickets.length === 0) {
    return <NoTickets onBrowseEvents={() => navigate('/events')} />;
  }

  const handleViewDetails = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Heading as="h1" size="xl" mb={8}>My Tickets</Heading>
      
      <Stack spacing={6}>
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            borderColor={borderColor}
            bgColor={bgColor}
            sidePanelBg={sidePanelBg}
            secondaryText={secondaryText}
            onViewDetails={handleViewDetails}
          />
        ))}
      </Stack>
    </Container>
  );
};

export default MyTickets;
