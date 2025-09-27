import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  FormErrorMessage,
  FormHelperText,
  Input,
  Select,
  VStack,
  Heading,
  Text,
  useToast,
  Spinner,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/dateUtils';

const CheckoutPage = () => {
  const { isAuthenticated, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Get event ID from URL if coming from an event page
  const eventId = new URLSearchParams(location.search).get('event');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/tickets/`);
        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }
        const data = await response.json();
        setTickets(data);
        if (data.length > 0) {
          setSelectedTicket(data[0].id);
        }
      } catch (err) {
        setError('Failed to load tickets. Please try again later.');
        console.error('Error fetching tickets:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchTickets();
    } else {
      setIsLoading(false);
    }
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      onOpen();
      return;
    }

    if (!selectedTicket) {
      setError('Please select a ticket type');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/purchase/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_id: selectedTicket,
          quantity,
          payment_method: paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process ticket purchase');
      }

      const data = await response.json();
      toast({
        title: 'Purchase successful!',
        description: 'Your tickets have been purchased successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirect to success page with order details
      navigate(`/ticket/success?order=${data.order_id}`);
    } catch (err) {
      setError(err.message || 'An error occurred while processing your purchase');
      console.error('Purchase error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);
  const totalPrice = selectedTicketData ? selectedTicketData.price * quantity : 0;

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!eventId) {
    return (
      <Box textAlign="center" py={10}>
        <Heading size="lg" mb={4}>No Event Selected</Heading>
        <Text>Please select an event to purchase tickets.</Text>
      </Box>
    );
  }

  if (tickets.length === 0 && !isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Heading size="lg" mb={4}>No Tickets Available</Heading>
        <Text>There are currently no tickets available for this event.</Text>
      </Box>
    );
  }

  return (
    <Box maxW="container.md" mx="auto" py={8} px={4}>
      <Heading as="h1" size="xl" mb={8} textAlign="center">
        Complete Your Purchase
      </Heading>

      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      <Box 
        bg="white" 
        p={6} 
        borderRadius="lg" 
        boxShadow="md"
      >
        <form onSubmit={handleSubmit}>
          <VStack spacing={6} align="stretch">
            <FormControl id="ticket-type" isRequired>
              <FormLabel>Ticket Type</FormLabel>
              <Select 
                value={selectedTicket} 
                onChange={(e) => setSelectedTicket(e.target.value)}
                bg="white"
              >
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.name} - {formatCurrency(ticket.price)}
                    {ticket.quantity_available !== null && 
                      ` (${ticket.quantity_available} remaining)`}
                  </option>
                ))}
              </Select>
              {selectedTicketData?.description && (
                <FormHelperText>{selectedTicketData.description}</FormHelperText>
              )}
            </FormControl>

            <FormControl id="quantity" isRequired>
              <FormLabel>Quantity</FormLabel>
              <NumberInput 
                min={1} 
                max={selectedTicketData?.quantity_available || 10}
                value={quantity}
                onChange={(valueString) => setQuantity(parseInt(valueString) || 1)}
                width="120px"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormHelperText>
                Maximum {selectedTicketData?.quantity_available || 10} per order
              </FormHelperText>
            </FormControl>

            <FormControl id="payment-method" isRequired>
              <FormLabel>Payment Method</FormLabel>
              <Select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                bg="white"
              >
                <option value="card">Credit/Debit Card</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Cash at Venue</option>
              </Select>
            </FormControl>

            <Box 
              bg="gray.50" 
              p={4} 
              borderRadius="md" 
              borderLeft="4px solid" 
              borderColor="blue.500"
            >
              <Text fontWeight="bold" mb={2}>Order Summary</Text>
              {selectedTicketData && (
                <>
                  <Text>
                    {quantity} x {selectedTicketData.name} @ {formatCurrency(selectedTicketData.price)} each
                  </Text>
                  <Text mt={2} fontSize="lg" fontWeight="bold">
                    Total: {formatCurrency(totalPrice)}
                  </Text>
                </>
              )}
            </Box>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              width="100%"
              isLoading={isSubmitting}
              loadingText="Processing..."
            >
              Complete Purchase
            </Button>
          </VStack>
        </form>
      </Box>

      {/* Login Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Sign In Required</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text mb={4}>You need to be signed in to purchase tickets.</Text>
            <Button 
              colorScheme="blue" 
              onClick={() => navigate('/login', { state: { from: location.pathname } })}
            >
              Sign In
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CheckoutPage;