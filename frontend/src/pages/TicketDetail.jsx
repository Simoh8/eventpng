import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardBody, CardHeader, Flex, Heading, Image, Text, VStack, useToast } from '@chakra-ui/react';
import { getTicket } from '../services/ticketService';

const TicketDetail = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await getTicket(id);
        setTicket(data);
      } catch (error) {
        console.error('Error fetching ticket:', error);
        toast({
          title: 'Error',
          description: 'Failed to load ticket details.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/tickets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [id, navigate, toast]);

  if (isLoading) {
    return <Box p={8}>Loading ticket details...</Box>;
  }

  if (!ticket) {
    return <Box p={8}>Ticket not found</Box>;
  }

  return (
    <Box maxW="container.md" mx="auto" py={8} px={4}>
      <Heading as="h1" size="xl" mb={8} textAlign="center">Your Ticket</Heading>
      
      <Card borderRadius="lg" overflow="hidden" boxShadow="lg">
        <CardHeader bg="blue.600" color="white">
          <Heading size="md">{ticket.event?.title || 'Event Ticket'}</Heading>
        </CardHeader>
        
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Flex justify="space-between" wrap="wrap">
              <Box>
                <Text fontWeight="bold">Date & Time</Text>
                <Text>{new Date(ticket.event?.date).toLocaleDateString()}</Text>
                {ticket.event?.time && <Text>{ticket.event.time}</Text>}
              </Box>
              
              <Box textAlign="right">
                <Text fontWeight="bold">Order #</Text>
                <Text>{ticket.id}</Text>
              </Box>
            </Flex>
            
            <Box>
              <Text fontWeight="bold">Location</Text>
              <Text>{ticket.event?.location || 'Venue information'}</Text>
            </Box>
            
            <Box>
              <Text fontWeight="bold">Ticket Type</Text>
              <Text>{ticket.ticket_type?.name || 'General Admission'}</Text>
              <Text color="gray.600">${ticket.amount_paid?.toFixed(2) || '0.00'}</Text>
            </Box>
            
            <Box textAlign="center" py={4}>
              {ticket.qr_code ? (
                <>
                  <Image 
                    src={ticket.qr_code} 
                    alt="Ticket QR Code" 
                    maxW="200px" 
                    mx="auto"
                    mb={4}
                  />
                  <Text fontSize="sm" color="gray.600">
                    Present this QR code at the entrance
                  </Text>
                </>
              ) : (
                <Text color="gray.500">QR Code not available</Text>
              )}
            </Box>
            
            <Button 
              colorScheme="blue" 
              mt={4}
              onClick={() => window.print()}
            >
              Print Ticket
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default TicketDetail;
