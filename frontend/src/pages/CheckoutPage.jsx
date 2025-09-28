import React, { useState, useEffect } from 'react';
import { purchaseTicket, createPaymentIntent } from '../services/ticketService';
import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  FormHelperText,
  VStack,
  HStack,
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
  Select,
  Card,
  CardBody,
  CardHeader,
  Stack,
  Container,
  Divider
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/dateUtils';
import { 
  FaArrowLeft, 
  FaLock, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaTicketAlt, 
  FaShoppingBag 
} from 'react-icons/fa';

const CheckoutPage = () => {
  const { isAuthenticated, token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const toast = useToast();
  
  // Function to clear the cart from localStorage
  const clearCart = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eventTicketsCart');
      }
    } catch (error) {
    }
  };
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Get state from location (coming from cart)
  const { selectedTickets: cartTickets = [], fromCart = false } = location.state || {};
  const eventId = new URLSearchParams(location.search).get('event');
  const hasSelectedTickets = fromCart && cartTickets && cartTickets.length > 0;

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/tickets/`);
        if (!response.ok) {
          throw new Error(`Failed to fetch tickets: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned non-JSON response');
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

    if (hasSelectedTickets) {
      setTickets(cartTickets);
      setSelectedTicket(cartTickets[0]?.id || '');
      setIsLoading(false);
    } else if (eventId) {
      fetchTickets();
    } else {
      setError('No event selected. Please select an event first.');
      setIsLoading(false);
    }
  }, [eventId, hasSelectedTickets, cartTickets]);

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);
  const totalPrice = selectedTicketData ? selectedTicketData.price * quantity : 0;
  const cartTotal = hasSelectedTickets 
    ? cartTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0)
    : 0;

  const validateForm = () => {
    const errors = {};
    
    if (!selectedTicket) {
      errors.ticket = 'Please select a ticket type';
    }
    
    if (quantity < 1) {
      errors.quantity = 'Quantity must be at least 1';
    }
    
    if (selectedTicketData && selectedTicketData.quantity_available !== null && quantity > selectedTicketData.quantity_available) {
      errors.quantity = `Only ${selectedTicketData.quantity_available} tickets available`;
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors).join(', '));
      return;
    }
  
    if (!isAuthenticated) {
      onOpen();
      return;
    }
  
    setIsSubmitting(true);
    setError('');
  
    try {
      if (hasSelectedTickets) {
        // For cash payments, we don't need to create payment intents
        if (paymentMethod === 'cash' || paymentMethod === 'pay_on_venue') {

          
          const purchasePromises = await Promise.all(
            cartTickets.map(ticket => {
              return purchaseTicket(ticket.id, ticket.quantity, paymentMethod, null, ticket.event_id);
            })
          );
          
          const successfulPurchases = purchasePromises.filter(result => result && (result.success || result.id));
          
          if (successfulPurchases.length === 0) {
            throw new Error('Failed to process any ticket purchases');
          }
          
          // Clear cart after successful purchase
          clearCart();
          
          // Navigate to success page with the first successful order ID
          const orderId = successfulPurchases[0].order_id || successfulPurchases[0].id || 'cash-payment';
          navigate(`/ticket/success?order=${orderId}`);
          return;
        }
        
        // For card payments, handle payment intents
        const purchasePromises = await Promise.all(
          cartTickets.map(async (ticket) => {
            // Create payment intent for each ticket in cart
            const paymentIntent = await createPaymentIntent(ticket.id, ticket.quantity, paymentMethod);
            
            if (!paymentIntent) {
              throw new Error('No response from payment service');
            }
            
            // Process the purchase with the payment intent
            return purchaseTicket(
              ticket.id, 
              ticket.quantity, 
              paymentMethod,
              paymentIntent.payment_intent_id
            );
          })
        );
        
        const successfulPurchases = purchasePromises.filter(result => result && (result.success || result.id));
        
        if (successfulPurchases.length === 0) {
          throw new Error('Failed to process any ticket purchases');
        }
        
        // Clear cart after successful purchase if cart context is available
        if (typeof window !== 'undefined' && window.clearCart) {
          window.clearCart();
        } else if (typeof clearCart === 'function') {
          clearCart();
        } else {
          console.warn('clearCart function not available');
        }
        
        // Navigate to success page with the first successful order ID
        const orderId = successfulPurchases[0].order_id || successfulPurchases[0].id || successfulPurchases[0].payment_intent_id;
        navigate(`/ticket/success?order=${orderId}`);
      } else {
        // Process single ticket
        const paymentIntent = await createPaymentIntent(selectedTicket, quantity, paymentMethod);
        
        if (!paymentIntent) {
          throw new Error('No response from payment service');
        }
        
        // For pay on venue, we don't need to process payment
        if (paymentMethod === 'pay_on_venue') {
          navigate(`/ticket/success?payment_intent=${paymentIntent.payment_intent_id}&method=venue`);
          return;
        }
        
        // For card payments, verify we have the required fields
        if (paymentMethod === 'card' && (!paymentIntent.client_secret || !paymentIntent.payment_intent_id)) {
          console.error('Invalid payment intent response:', paymentIntent);
          throw new Error('Invalid payment service response. Please try again.');
        }
        
        // Process the purchase with the payment intent
        const result = await purchaseTicket(
          selectedTicket,
          quantity,
          paymentMethod,
          paymentIntent.payment_intent_id
        );
        
  
        if (result && (result.success || result.id)) {
          // Navigate to success page with order ID or payment intent ID
          const orderId = result.order_id || result.id || paymentIntent.payment_intent_id;
          navigate(`/ticket/success?order=${orderId}`);
        } else {
          throw new Error(result?.error || 'Failed to complete purchase');
        }
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'An error occurred while processing your payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.md" centerContent py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" thickness="3px" speed="0.65s" color="blue.500" />
          <Text fontSize="lg" color="gray.600">Loading checkout...</Text>
        </VStack>
      </Container>
    );
  }

  if (!eventId && !hasSelectedTickets) {
    return (
      <Container maxW="container.md" centerContent py={20}>
        <VStack spacing={4} textAlign="center">
          <Heading size="lg" color="gray.700">No Event Selected</Heading>
          <Text color="gray.600">Please select an event to purchase tickets.</Text>
          <Button colorScheme="blue" onClick={() => navigate('/events')} mt={4}>
            Browse Events
          </Button>
        </VStack>
      </Container>
    );
  }

  if (tickets.length === 0 && !isLoading && !hasSelectedTickets) {
    return (
      <Container maxW="container.md" centerContent py={20}>
        <VStack spacing={4} textAlign="center">
          <Heading size="lg" color="gray.700">No Tickets Available</Heading>
          <Text color="gray.600">There are currently no tickets available for this event.</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.md" centerContent py={8} px={4}>
      {/* Back Button */}
      <Box w="50%" mb={6}>
        <Button 
          leftIcon={<FaArrowLeft />} 
          variant="ghost" 
          onClick={() => navigate(-1)}
          size="sm"
          color="gray.600"
          _hover={{ bg: 'gray.100' }}
        >
          Back
        </Button>
      </Box>

      {/* Main Content */}
      <Box w="50%" minW="400px">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={3} textAlign="center">
            <Box p={3} bg="blue.50" borderRadius="full" color="blue.500">
              <FaShoppingBag size={24} />
            </Box>
            <Heading as="h1" size="xl" color="gray.800" fontWeight="bold">
              Checkout
            </Heading>
            <Text color="gray.500" fontSize="lg">
              Complete your purchase securely
            </Text>
          </VStack>
          
          {error && (
            <Alert status="error" borderRadius="lg" variant="left-accent">
              <AlertIcon />
              <Box>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Box>
            </Alert>
          )}

          <Stack spacing={6} w="100%">
            {/* Order Summary Card */}
            <Card 
              variant="elevated" 
              shadow="lg" 
              borderRadius="xl" 
              border="1px solid"
              borderColor="gray.100"
            >
              <CardHeader pb={4}>
                <HStack spacing={3}>
                  <Box color="blue.500">
                    <FaTicketAlt />
                  </Box>
                  <Heading size="md" color="gray.700">Order Summary</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                {hasSelectedTickets ? (
                  <>
                    {cartTickets.map((ticket, index) => (
                      <Box 
                        key={index} 
                        mb={4} 
                        pb={4} 
                        borderBottom={index < cartTickets.length - 1 ? "1px solid" : "none"} 
                        borderColor="gray.100"
                      >
                        <HStack justify="space-between" mb={1}>
                          <Text fontWeight="semibold" fontSize="md" color="gray.800">
                            {ticket.event_name || 'Event'}
                          </Text>
                          <Text fontSize="md" fontWeight="bold" color="blue.600">
                            {formatCurrency(ticket.price * ticket.quantity)}
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          {ticket.ticket_type_name || ticket.name} × {ticket.quantity}
                        </Text>
                        <Text fontSize="sm" color="gray.500" mt={1}>
                          {formatCurrency(ticket.price)} each
                        </Text>
                      </Box>
                    ))}
                    
                    <Divider my={4} />
                    <HStack justify="space-between">
                      <Text fontSize="xl" fontWeight="bold" color="gray.800">Total</Text>
                      <Text fontSize="xl" fontWeight="bold" color="blue.600">
                        {formatCurrency(cartTotal)}
                      </Text>
                    </HStack>
                  </>
                ) : (
                  selectedTicketData && (
                    <>
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="semibold" fontSize="md" color="gray.800">
                          {selectedTicketData.event_name || 'Event'}
                        </Text>
                        <Text fontSize="md" fontWeight="bold" color="blue.600">
                          {formatCurrency(totalPrice)}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600" mb={1}>
                        {quantity} × {selectedTicketData.name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {formatCurrency(selectedTicketData.price)} each
                      </Text>
                      
                      <Divider my={4} />
                      <HStack justify="space-between">
                        <Text fontSize="xl" fontWeight="bold" color="gray.800">Total</Text>
                        <Text fontSize="xl" fontWeight="bold" color="blue.600">
                          {formatCurrency(totalPrice)}
                        </Text>
                      </HStack>
                    </>
                  )
                )}
              </CardBody>
            </Card>

            {/* Payment Section Card */}
            <Card 
              variant="elevated" 
              shadow="lg" 
              borderRadius="xl" 
              border="1px solid"
              borderColor="gray.100"
            >
              <CardHeader pb={4}>
                <HStack spacing={3}>
                  <Box color="green.500">
                    <FaLock />
                  </Box>
                  <Heading size="md" color="gray.700">Payment Details</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={6} align="stretch">
                  {/* Payment Method */}
                  <FormControl>
                    <FormLabel fontSize="md" fontWeight="semibold" color="gray.700">
                      Payment Method
                    </FormLabel>
                    <Select 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      size="lg"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{ borderColor: 'gray.400' }}
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                    >
                      <option value="card">Credit/Debit Card</option>
                      <option value="cash">Pay at Venue</option>
                    </Select>
                  </FormControl>

                  {/* Payment Method Info */}
                  {paymentMethod === 'card' && (
                    <Box 
                      p={4} 
                      borderRadius="lg" 
                      bg="blue.50" 
                      border="1px" 
                      borderColor="blue.200"
                      transition="all 0.2s"
                      _hover={{ shadow: 'sm' }}
                    >
                      <HStack spacing={4}>
                        <Box p={2} bg="white" borderRadius="md" border="1px solid" borderColor="blue.100">
                          <FaCreditCard color="#3182CE" size={20} />
                        </Box>
                        <Box flex={1}>
                          <Text fontSize="md" fontWeight="semibold" color="blue.800">
                            Secure Card Payment
                          </Text>
                          <Text fontSize="sm" color="blue.600" mt={1}>
                            Your payment information is encrypted and secure
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  )}

                  {paymentMethod === 'cash' && (
                    <Box 
                      p={4} 
                      borderRadius="lg" 
                      bg="green.50" 
                      border="1px" 
                      borderColor="green.200"
                      transition="all 0.2s"
                      _hover={{ shadow: 'sm' }}
                    >
                      <HStack spacing={4}>
                        <Box p={2} bg="white" borderRadius="md" border="1px solid" borderColor="green.100">
                          <FaMoneyBillWave color="#38A169" size={20} />
                        </Box>
                        <Box flex={1}>
                          <Text fontSize="md" fontWeight="semibold" color="green.800">
                            Pay at Venue
                          </Text>
                          <Text fontSize="sm" color="green.600" mt={1}>
                            Pay when you arrive at the event venue
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  )}

                  {/* Quantity Selector (only for single ticket purchase) */}
                  {!hasSelectedTickets && (
                    <FormControl>
                      <FormLabel fontSize="md" fontWeight="semibold" color="gray.700">
                        Quantity
                      </FormLabel>
                      <NumberInput 
                        min={1} 
                        max={selectedTicketData?.quantity_available || 10}
                        value={quantity}
                        onChange={(valueString) => setQuantity(parseInt(valueString) || 1)}
                        width="140px"
                        size="lg"
                      >
                        <NumberInputField 
                          borderRadius="lg"
                          borderColor="gray.300"
                          _hover={{ borderColor: 'gray.400' }}
                          _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <FormHelperText fontSize="sm" color="gray.500">
                        Maximum {selectedTicketData?.quantity_available || 10} tickets available
                      </FormHelperText>
                    </FormControl>
                  )}

                  {/* Submit Button */}
                  <Button
                    colorScheme="blue"
                    size="lg"
                    height="56px"
                    width="100%"
                    isLoading={isSubmitting}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    leftIcon={<FaLock />}
                    borderRadius="lg"
                    fontWeight="bold"
                    fontSize="md"
                    shadow="md"
                    _hover={{ shadow: 'lg', transform: 'translateY(-1px)' }}
                    _active={{ transform: 'translateY(0)' }}
                    transition="all 0.2s"
                    mt={2}
                  >
                    {isSubmitting ? 'Processing...' : `Pay ${formatCurrency(hasSelectedTickets ? cartTotal : totalPrice)}`}
                  </Button>

                  <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
                    <FaLock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Your payment is secure and encrypted
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </Stack>
        </VStack>
      </Box>

      {/* Login Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent borderRadius="xl" mx={4}>
          <ModalHeader borderBottom="1px solid" borderColor="gray.200">
            Sign In Required
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={4}>
              <Text color="gray.600" textAlign="center">
                You need to be signed in to purchase tickets. Please sign in to continue with your purchase.
              </Text>
              <Button 
                colorScheme="blue" 
                onClick={() => navigate('/login', { state: { from: location } })}
                width="100%"
                size="lg"
                borderRadius="lg"
              >
                Sign In
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/signup')}
                width="100%"
              >
                Create New Account
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default CheckoutPage;