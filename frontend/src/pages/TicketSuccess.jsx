import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Heading, Text, VStack, Icon, useToast } from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

const TicketSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  
  const { ticket } = location.state || {};
  
  React.useEffect(() => {
    if (!ticket) {
      toast({
        title: 'No ticket information found',
        description: 'Please complete your purchase to view this page.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    }
  }, [ticket, navigate, toast]);

  if (!ticket) return null;

  return (
    <Container maxW="container.md" py={16} centerContent>
      <VStack spacing={8} textAlign="center">
        <Icon as={CheckCircleIcon} boxSize={20} color="green.500" />
        
        <Heading as="h1" size="2xl">
          Thank You for Your Purchase!
        </Heading>
        
        <Text fontSize="xl" color="gray.600">
          Your ticket for <strong>{ticket.event?.title}</strong> has been successfully purchased.
        </Text>
        
        <Box bg="green.50" p={6} borderRadius="lg" w="100%" maxW="md">
          <Text fontSize="lg" fontWeight="bold" mb={2}>Order Confirmation</Text>
          <Text>Order #: {ticket.id}</Text>
          <Text>Event: {ticket.event?.title}</Text>
          <Text>Date: {new Date(ticket.event?.date).toLocaleDateString()}</Text>
          <Text>Amount: ${ticket.amount_paid?.toFixed(2)}</Text>
          <Text color="green.600" fontWeight="bold" mt={2}>
            {ticket.payment_method === 'cash' 
              ? 'Please pay at the venue' 
              : 'Payment successful!'}
          </Text>
        </Box>
        
        <VStack spacing={4} w="100%" maxW="sm">
          <Button 
            colorScheme="blue" 
            size="lg" 
            w="full"
            onClick={() => navigate(`/tickets/${ticket.id}`)}
          >
            View Your Ticket
          </Button>
          
          <Button 
            variant="outline" 
            w="full"
            onClick={() => navigate('/events')}
          >
            Back to Events
          </Button>
          
          <Text fontSize="sm" color="gray.500" mt={4}>
            A confirmation email has been sent to your registered email address.
          </Text>
        </VStack>
      </VStack>
    </Container>
  );
};

export default TicketSuccess;
