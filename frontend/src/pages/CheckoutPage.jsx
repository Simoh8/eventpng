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
  Divider,
  Input,
  Grid,
  GridItem
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
  FaShoppingBag,
  FaUser,
  FaMobile,
  FaGoogle
} from 'react-icons/fa';

const CheckoutPage = () => {
  const { isAuthenticated, token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Card payment fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [email, setEmail] = useState('');
  
  // Mobile money fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mobileProvider, setMobileProvider] = useState('safaricom');
  
  const toast = useToast();
  
  // Function to clear the cart from localStorage
  const clearCart = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eventTicketsCart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };
  
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      if (window.PaystackPop && window.PaystackPop.setup) {
        console.log('Paystack loaded successfully');
      } else {
        console.error('Paystack failed to load properly');
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
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

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  // Format phone number
  const formatPhoneNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.startsWith('0')) {
      return `+254 ${v.substring(1)}`;
    } else if (v.startsWith('254')) {
      return `+254 ${v.substring(3)}`;
    } else if (v.startsWith('+254')) {
      return `+254 ${v.substring(4)}`;
    }
    return v;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleExpiryDateChange = (e) => {
    const formatted = formatExpiryDate(e.target.value);
    setExpiryDate(formatted);
  };

  const handlePhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

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
    
    // Card validation
    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        errors.cardNumber = 'Please enter a valid card number';
      }
      
      if (!cardName.trim()) {
        errors.cardName = 'Please enter the name on card';
      }
      
      if (!expiryDate || expiryDate.length < 5) {
        errors.expiryDate = 'Please enter a valid expiry date';
      }
      
      if (!cvv || cvv.length < 3) {
        errors.cvv = 'Please enter a valid CVV';
      }
      
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    // Mobile money validation
    if (paymentMethod === 'mobile_money') {
      if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9) {
        errors.phoneNumber = 'Please enter a valid phone number';
      }
      
      if (!mobileProvider) {
        errors.mobileProvider = 'Please select a mobile provider';
      }
    }
    
    return errors;
  };

  const handlePaystackPayment = async (paymentData) => {
    try {
      // Initialize Paystack payment
      const paystack = window.PaystackPop.setup({
        key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY,
        email: user?.email || email,
        amount: paymentData.amount * 100, // Convert to kobo
        ref: paymentData.reference,
        metadata: {
          custom_fields: [
            {
              display_name: 'Event Ticket',
              variable_name: 'event_ticket',
              value: paymentData.metadata.ticket_type_id
            }
          ]
        },
        callback: function(response) {
          // Verify payment with your backend
          verifyPayment(response.reference, paymentData);
        },
        onClose: function() {
          // Handle when user closes payment modal
          setIsSubmitting(false);
          toast({
            title: 'Payment cancelled',
            description: 'You cancelled the payment process.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      });
      
      paystack.openIframe();
    } catch (error) {
      console.error('Paystack error:', error);
      throw new Error('Failed to initialize payment. Please try again.');
    }
  };

  const verifyPayment = async (reference, paymentData) => {
    try {
      // Call your backend to verify the payment
      const response = await fetch(`/api/payments/verify/${reference}/`);
      const data = await response.json();
      
      if (data.status === 'success') {
        // Process the purchase after successful payment
        await processPurchase(paymentData, reference);
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError(error.message || 'Failed to verify payment. Please contact support.');
      setIsSubmitting(false);
    }
  };

  const processPurchase = async (paymentData, reference) => {
    try {
      let result;
      
      if (hasSelectedTickets) {
        // Process multiple tickets from cart
        const purchasePromises = await Promise.all(
          cartTickets.map(ticket => (
            purchaseTicket(
              ticket.event_id,
              ticket.id,
              ticket.quantity,
              paymentMethod,
              reference
            )
          ))
        );
        
        const successfulPurchases = purchasePromises.filter(result => result && (result.success || result.id));
        
        if (successfulPurchases.length === 0) {
          throw new Error('Failed to process any ticket purchases');
        }
        
        // Clear cart after successful purchase
        clearCart();
        
        // Navigate to success page with the first successful order ID
        const orderId = successfulPurchases[0].order_id || successfulPurchases[0].id || reference;
        navigate(`/ticket/success?order=${orderId}`);
      } else {
        // Process single ticket
        result = await purchaseTicket(
          paymentData.metadata.event_id,
          paymentData.metadata.ticket_type_id,
          paymentData.metadata.quantity,
          paymentMethod,
          reference
        );
        
        if (result && (result.success || result.id)) {
          // Navigate to success page with order ID or reference
          const orderId = result.order_id || result.id || reference;
          navigate(`/ticket/success?order=${orderId}`);
        } else {
          throw new Error(result?.error || 'Failed to complete purchase');
        }
      }
    } catch (error) {
      console.error('Purchase processing error:', error);
      setError(error.message || 'An error occurred while processing your purchase.');
      setIsSubmitting(false);
    }
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
      // For cash or pay on venue
      if (paymentMethod === 'cash' || paymentMethod === 'pay_on_venue') {
        if (hasSelectedTickets) {
          // Handle multiple tickets for cash/venue payment
          const purchasePromises = await Promise.all(
            cartTickets.map(ticket => (
              purchaseTicket(
                ticket.event_id,
                ticket.id,
                ticket.quantity,
                paymentMethod
              )
            ))
          );
          
          const successfulPurchases = purchasePromises.filter(result => result && (result.success || result.id));
          
          if (successfulPurchases.length === 0) {
            throw new Error('Failed to process any ticket purchases');
          }
          
          clearCart();
          const orderId = successfulPurchases[0].order_id || successfulPurchases[0].id || 'cash-payment';
          navigate(`/ticket/success?order=${orderId}`);
        } else {
          // Handle single ticket for cash/venue payment
          const result = await purchaseTicket(
            selectedTicketData.event.id,
            selectedTicket,
            quantity,
            paymentMethod
          );
          
          if (result && (result.success || result.id)) {
            const orderId = result.order_id || result.id || 'cash-payment';
            navigate(`/ticket/success?order=${orderId}`);
          } else {
            throw new Error(result?.error || 'Failed to complete purchase');
          }
        }
        return;
      }
      
      // For Paystack payment
      if (hasSelectedTickets) {
        // Create payment for cart items
        const paymentData = await createPaymentIntent(
          cartTickets[0].event_id, // Assuming all tickets are for the same event
          cartTickets[0].id, // Just use the first ticket ID for the payment
          cartTickets.reduce((sum, ticket) => sum + ticket.quantity, 0) // Total quantity
        );
        
        if (!paymentData || !paymentData.data || !paymentData.data.payment_url) {
          throw new Error('Failed to initialize payment. Please try again.');
        }
        
        // Handle Paystack payment
        await handlePaystackPayment(paymentData.data);
      } else {
        // Create payment for single ticket
        const paymentData = await createPaymentIntent(
          selectedTicketData.event.id,
          selectedTicket,
          quantity
        );
        
        if (!paymentData || !paymentData.data || !paymentData.data.payment_url) {
          throw new Error('Failed to initialize payment. Please try again.');
        }
        
        // Handle Paystack payment
        await handlePaystackPayment(paymentData.data);
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
      <Container maxW="60%" centerContent py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" thickness="3px" speed="0.65s" color="blue.500" />
          <Text fontSize="lg" color="gray.600">Loading checkout...</Text>
        </VStack>
      </Container>
    );
  }

  if (!eventId && !hasSelectedTickets) {
    return (
      <Container maxW="60%" centerContent py={20}>
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
      <Container maxW="60%" centerContent py={20}>
        <VStack spacing={4} textAlign="center">
          <Heading size="lg" color="gray.700">No Tickets Available</Heading>
          <Text color="gray.600">There are currently no tickets available for this event.</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="60%" centerContent py={8} px={4}>
      {/* Back Button */}
      <Box w="100%" mb={6}>
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
      <Box w="100%" minW="400px">
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
                    <VStack spacing={4} align="stretch">
                      {/* Card Payment Option */}
                      <Box 
                        as="button"
                        type="button"
                        p={6} 
                        borderRadius="lg" 
                        bg={paymentMethod === 'card' ? 'blue.50' : 'white'}
                        border="1px" 
                        borderColor={paymentMethod === 'card' ? 'blue.300' : 'gray.200'}
                        onClick={() => setPaymentMethod('card')}
                        textAlign="left"
                        _hover={{ 
                          borderColor: 'blue.400',
                          shadow: 'md',
                          transform: 'translateY(-2px)'
                        }}
                        transition="all 0.2s"
                      >
                        <HStack spacing={4}>
                          <Box p={3} bg="white" borderRadius="md" border="1px" borderColor={paymentMethod === 'card' ? 'blue.200' : 'gray.200'} boxShadow="sm">
                            <FaCreditCard color={paymentMethod === 'card' ? '#3182CE' : '#718096'} size={24} />
                          </Box>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold" color="gray.800" fontSize="lg">Credit/Debit Card</Text>
                            <Text fontSize="sm" color="gray.500">Pay with Visa, Mastercard, or Verve</Text>
                          </VStack>
                        </HStack>
                      </Box>

                      {/* Google Pay Option */}
                      <Box 
                        as="button"
                        type="button"
                        p={6} 
                        borderRadius="lg" 
                        bg={paymentMethod === 'google_pay' ? 'blue.50' : 'white'}
                        border="1px" 
                        borderColor={paymentMethod === 'google_pay' ? 'blue.300' : 'gray.200'}
                        onClick={() => setPaymentMethod('google_pay')}
                        textAlign="left"
                        _hover={{ 
                          borderColor: 'blue.400',
                          shadow: 'md',
                          transform: 'translateY(-2px)'
                        }}
                        transition="all 0.2s"
                      >
                        <HStack spacing={4}>
                          <Box p={3} bg="white" borderRadius="md" border="1px" borderColor={paymentMethod === 'google_pay' ? 'blue.200' : 'gray.200'} boxShadow="sm">
                            <FaGoogle color={paymentMethod === 'google_pay' ? '#3182CE' : '#718096'} size={24} />
                          </Box>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold" color="gray.800" fontSize="lg">Google Pay</Text>
                            <Text fontSize="sm" color="gray.500">Fast and secure payment with Google Pay</Text>
                          </VStack>
                        </HStack>
                      </Box>

                      {/* Mobile Money Option */}
                      <Box 
                        as="button"
                        type="button"
                        p={6} 
                        borderRadius="lg" 
                        bg={paymentMethod === 'mobile_money' ? 'blue.50' : 'white'}
                        border="1px" 
                        borderColor={paymentMethod === 'mobile_money' ? 'blue.300' : 'gray.200'}
                        onClick={() => setPaymentMethod('mobile_money')}
                        textAlign="left"
                        _hover={{ 
                          borderColor: 'blue.400',
                          shadow: 'md',
                          transform: 'translateY(-2px)'
                        }}
                        transition="all 0.2s"
                      >
                        <HStack spacing={4}>
                          <Box p={3} bg="white" borderRadius="md" border="1px" borderColor={paymentMethod === 'mobile_money' ? 'blue.200' : 'gray.200'} boxShadow="sm">
                            <FaMoneyBillWave color={paymentMethod === 'mobile_money' ? '#3182CE' : '#718096'} size={24} />
                          </Box>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold" color="gray.800" fontSize="lg">Mobile Money</Text>
                            <Text fontSize="sm" color="gray.500">Pay with your mobile money account</Text>
                          </VStack>
                        </HStack>
                      </Box>

                      {/* Pay at Venue Option */}
                      <Box 
                        as="button"
                        type="button"
                        p={6} 
                        borderRadius="lg" 
                        bg={paymentMethod === 'pay_on_venue' ? 'green.50' : 'white'}
                        border="1px" 
                        borderColor={paymentMethod === 'pay_on_venue' ? 'green.300' : 'gray.200'}
                        onClick={() => setPaymentMethod('pay_on_venue')}
                        textAlign="left"
                        _hover={{ 
                          borderColor: 'green.400',
                          shadow: 'md',
                          transform: 'translateY(-2px)'
                        }}
                        transition="all 0.2s"
                      >
                        <HStack spacing={4}>
                          <Box p={3} bg="white" borderRadius="md" border="1px" borderColor={paymentMethod === 'pay_on_venue' ? 'green.200' : 'gray.200'} boxShadow="sm">
                            <FaMoneyBillWave color={paymentMethod === 'pay_on_venue' ? '#38A169' : '#718096'} size={24} />
                          </Box>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold" color="gray.800" fontSize="lg">Pay at Venue</Text>
                            <Text fontSize="sm" color="gray.500">Pay when you arrive at the event</Text>
                          </VStack>
                        </HStack>
                      </Box>
                    </VStack>
                  </FormControl>

                  {/* Card Payment Form */}
                  {paymentMethod === 'card' && (
                    <Box 
                      p={6} 
                      borderRadius="lg" 
                      bg="blue.50" 
                      border="1px" 
                      borderColor="blue.200"
                      transition="all 0.2s"
                    >
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="lg" fontWeight="semibold" color="blue.800" mb={2}>
                          Card Details
                        </Text>
                        
                        {/* Card Number */}
                        <FormControl isRequired>
                          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                            Card Number
                          </FormLabel>
                          <Input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            maxLength={19}
                            bg="white"
                            borderRadius="lg"
                            size="lg"
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                          />
                        </FormControl>

                        {/* Card Holder Name */}
                        <FormControl isRequired>
                          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                            Name on Card
                          </FormLabel>
                          <Input
                            type="text"
                            placeholder="John Doe"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            bg="white"
                            borderRadius="lg"
                            size="lg"
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                          />
                        </FormControl>

                        {/* Expiry and CVV */}
                        <Grid templateColumns="1fr 1fr" gap={4}>
                          <GridItem>
                            <FormControl isRequired>
                              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                                Expiry Date
                              </FormLabel>
                              <Input
                                type="text"
                                placeholder="MM/YY"
                                value={expiryDate}
                                onChange={handleExpiryDateChange}
                                maxLength={5}
                                bg="white"
                                borderRadius="lg"
                                size="lg"
                                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                              />
                            </FormControl>
                          </GridItem>
                          <GridItem>
                            <FormControl isRequired>
                              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                                CVV
                              </FormLabel>
                              <Input
                                type="text"
                                placeholder="123"
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                maxLength={4}
                                bg="white"
                                borderRadius="lg"
                                size="lg"
                                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                              />
                            </FormControl>
                          </GridItem>
                        </Grid>

                        {/* Email */}
                        <FormControl isRequired>
                          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                            Email Address
                          </FormLabel>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            bg="white"
                            borderRadius="lg"
                            size="lg"
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                          />
                          <FormHelperText fontSize="xs" color="gray.500">
                            Receipt and ticket will be sent to this email
                          </FormHelperText>
                        </FormControl>
                      </VStack>
                    </Box>
                  )}

                  {/* Google Pay Info */}
                  {paymentMethod === 'google_pay' && (
                    <Box 
                      p={6} 
                      borderRadius="lg" 
                      bg="blue.50" 
                      border="1px" 
                      borderColor="blue.200"
                      transition="all 0.2s"
                    >
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="lg" fontWeight="semibold" color="blue.800" mb={2}>
                          Google Pay
                        </Text>
                        <HStack spacing={4}>
                          <Box p={2} bg="white" borderRadius="md" border="1px solid" borderColor="blue.100">
                            <FaGoogle color="#3182CE" size={24} />
                          </Box>
                          <Box flex={1}>
                            <Text fontSize="md" fontWeight="semibold" color="blue.800">
                              Fast and Secure Payment
                            </Text>
                            <Text fontSize="sm" color="blue.600" mt={1}>
                              You will be redirected to Google Pay to complete your payment securely
                            </Text>
                          </Box>
                        </HStack>
                      </VStack>
                    </Box>
                  )}

                  {/* Mobile Money Form */}
                  {paymentMethod === 'mobile_money' && (
                    <Box 
                      p={6} 
                      borderRadius="lg" 
                      bg="blue.50" 
                      border="1px" 
                      borderColor="blue.200"
                      transition="all 0.2s"
                    >
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="lg" fontWeight="semibold" color="blue.800" mb={2}>
                          Mobile Money Details
                        </Text>
                        
                        {/* Mobile Provider */}
                        <FormControl isRequired>
                          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                            Mobile Provider
                          </FormLabel>
                          <Select
                            value={mobileProvider}
                            onChange={(e) => setMobileProvider(e.target.value)}
                            bg="white"
                            borderRadius="lg"
                            size="lg"
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                          >
                            <option value="safaricom">Safaricom (M-Pesa)</option>
                            <option value="airtel">Airtel Money</option>
                          </Select>
                        </FormControl>

                        {/* Phone Number */}
                        <FormControl isRequired>
                          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                            Phone Number
                          </FormLabel>
                          <Input
                            type="tel"
                            placeholder="+254 7XX XXX XXX"
                            value={phoneNumber}
                            onChange={handlePhoneNumberChange}
                            bg="white"
                            borderRadius="lg"
                            size="lg"
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                          />
                          <FormHelperText fontSize="xs" color="gray.500">
                            Enter your mobile money registered phone number
                          </FormHelperText>
                        </FormControl>

                        {/* Instructions based on provider */}
                        <Box 
                          p={4} 
                          borderRadius="md" 
                          bg="white" 
                          border="1px" 
                          borderColor="blue.100"
                        >
                          <Text fontSize="sm" color="blue.700" fontWeight="medium">
                            {mobileProvider === 'safaricom' 
                              ? 'You will receive an M-Pesa prompt on your phone to complete the payment'
                              : 'You will receive an Airtel Money prompt on your phone to complete the payment'
                            }
                          </Text>
                        </Box>
                      </VStack>
                    </Box>
                  )}

                  {/* Payment Method Info */}
                  {paymentMethod === 'pay_on_venue' && (
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
                            Pay when you arrive at the event venue. Your tickets will be reserved.
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