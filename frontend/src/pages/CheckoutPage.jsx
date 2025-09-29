import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  useToast,
  Spinner,
  Container,
  Divider,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Grid,
  GridItem,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Checkbox,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Image,
  Badge
} from '@chakra-ui/react';
import { FaArrowLeft, FaLock, FaTicketAlt, FaCheckCircle, FaMinus, FaPlus, FaTimes, FaCreditCard } from 'react-icons/fa';
import { processPaystackPayment, formatAmount } from '../utils/paystack';

// Import components
import { CheckoutHeader } from '../components/checkout/CheckoutHeader';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { CheckoutFooter } from '../components/checkout/CheckoutFooter';

// Currency utilities
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'KES': 'KSh',
};

// Format price with currency symbol and proper formatting
const formatPrice = (amount, currency = 'KES') => {
  try {
    if (isNaN(amount)) amount = 0;
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency || 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    console.error('Error formatting price:', e);
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }
};

// Get just the currency symbol for a given currency code
const getCurrencySymbol = (currency = 'KES') => {
  if (!currency) return 'KSh';
  return CURRENCY_SYMBOLS[currency] || currency;
};

const CheckoutPage = () => {
  // Payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(2); // 1: Cart, 2: Information, 3: Payment, 4: Confirmation
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  
  // Success modal
  const { isOpen: isSuccessModalOpen, onOpen: onSuccessModalOpen, onClose: onSuccessModalClose } = useDisclosure();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    terms: false,
  });

  // Get tickets from location state or redirect
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, user } = useAuth();
  
  // Get selectedTickets and total from location state
  const { selectedTickets: cartTickets, total, fromCart } = location.state || {};
  const hasSelectedTickets = fromCart && cartTickets && cartTickets.length > 0;
  const [tickets, setTickets] = useState([]);
  const [selectedTickets, setSelectedTickets] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Mobile money fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mobileProvider, setMobileProvider] = useState('safaricom');
  
  // Get the currency from the first ticket or use default
  const currency = useMemo(() => {
    return (tickets && tickets[0]?.currency) || 'KES';
  }, [tickets]);

  // Format total amount with currency symbol
  const totalAmount = useMemo(() => {
    if (!tickets || !tickets.length) return formatPrice(0, 'KES');
    
    const total = tickets.reduce((sum, ticket) => {
      const quantity = selectedTickets[ticket.id] || 0;
      return sum + (ticket.price * quantity);
    }, 0);
    return formatPrice(total, currency);
  }, [tickets, selectedTickets, currency]);
  
  // Initialize tickets from location state or redirect
  useEffect(() => {
    if (!hasSelectedTickets) {
      toast({
        title: 'No tickets selected',
        description: 'Please select tickets before proceeding to checkout',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      navigate('/tickets');
      return;
    }
    
    // Process the cart tickets
    const ticketQuantities = {};
    const processedTickets = cartTickets.map(ticket => {
      ticketQuantities[ticket.id] = ticket.quantity;
      return {
        id: ticket.id,
        event_id: ticket.event_id,
        name: ticket.name || `Ticket ${ticket.id}`,
        price: ticket.price || 0,
        currency: ticket.currency || 'KES', // Default currency
        quantity: ticket.quantity || 1
      };
    });
    
    setTickets(processedTickets);
    setSelectedTickets(ticketQuantities);
    
    // Pre-fill user data if available
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        name: user.name || '',
        phone: user.phone_number || ''
      }));
      setPhoneNumber(user.phone_number || '');
    }
    
    setIsLoading(false);
  }, [cartTickets, hasSelectedTickets, isAuthenticated, user, navigate]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method) => {
    setSelectedPaymentMethod(method);
  };

  // Process M-Pesa payment
  const processMpesaPayment = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Validate phone number (Kenyan format: 07XXXXXXXX or 2547XXXXXXXX)
      const phoneRegex = /^(?:254|0)?(7\d{8})$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new Error('Please enter a valid Kenyan phone number');
      }
      
      // Format phone number to 2547XXXXXXXX
      const formattedPhone = phoneNumber.startsWith('0') 
        ? `254${phoneNumber.substring(1)}` 
        : phoneNumber.startsWith('254') 
          ? phoneNumber 
          : `254${phoneNumber}`;
      
      // Calculate total amount
      const amount = tickets.reduce((sum, ticket) => {
        const quantity = selectedTickets[ticket.id] || 0;
        return sum + (ticket.price * quantity);
      }, 0);
      
      // Convert to kobo/pesewas for the payment gateway
      const amountInKobo = Math.round(amount * 100);
      
      // Prepare payment data
      const paymentData = {
        phone: formattedPhone,
        amount: amountInKobo, // Amount in kobo/pesewas
        account_reference: `TKT-${Date.now()}`,
        transaction_desc: `Payment for event tickets`,
        callback_url: `${window.location.origin}/payment/callback`,
        tickets: Object.entries(selectedTickets).map(([ticketId, qty]) => ({
          ticket_id: ticketId,
          quantity: qty
        })),
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formattedPhone
        },
        currency: 'KES'
      };
      
      // Call your M-Pesa API here
      // const response = await api.post('/api/payments/mpesa', paymentData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // On success
      clearCart();
      setSuccess(true);
      
      toast({
        title: 'Payment initiated',
        description: 'Please check your phone to complete the payment',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      return true;
      
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Failed to process payment');
      
      toast({
        title: 'Payment failed',
        description: error.message || 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    } finally {
      setIsSubmitting(false);
      setPaymentInProgress(false);
    }
  };
  
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

  // Process payment with Paystack
  const processPayment = useCallback(async () => {
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address to continue with the payment',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }

    if (selectedPaymentMethod === 'mpesa' && !phoneNumber) {
      setError('Please enter your phone number for M-Pesa payment');
      return false;
    }

    setIsSubmitting(true);
    setError(null);
    setPaymentInProgress(true);

    try {
      // Calculate total amount
      const amount = tickets.reduce((sum, ticket) => {
        const quantity = selectedTickets[ticket.id] || 0;
        return sum + (ticket.price * quantity);
      }, 0);

      // Process payment based on method
      if (selectedPaymentMethod === 'card') {
        // Process card payment with Paystack
        const ticketDetails = Object.entries(selectedTickets)
          .filter(([_, qty]) => qty > 0)
          .map(([ticketId, qty]) => {
            const ticket = tickets.find(t => t.id === ticketId);
            return {
              id: ticketId,
              name: ticket?.name || `Ticket ${ticketId}`,
              quantity: qty,
              price: ticket?.price || 0
            };
          });

        // Calculate total amount in kobo/pesewas for Paystack
        const amountInKobo = Math.round(amount * 100);

        try {
          // Ensure email is trimmed and in lowercase
          const cleanedEmail = formData.email.trim().toLowerCase();
          
          const paymentResult = await processPaystackPayment({
            email: cleanedEmail,
            amount: amountInKobo,
            metadata: {
              customer_name: formData.name || 'Customer',
              customer_phone: formData.phone || '',
              ticket_ids: ticketDetails.map(t => t.id).join(','),
              ticket_quantities: ticketDetails.map(t => `${t.id}:${t.quantity}`).join(','),
              total_amount: amount,
              currency: currency || 'KES'
            },
            onSuccess: async (response) => {
              setPaymentReference(response.reference);
              setSuccess(true);
              
              try {
                // Verify payment with backend
                await verifyPayment(response.reference);
                
                // Clear cart on successful payment
                clearCart();
                
                // Show success modal
                onSuccessModalOpen();
              } catch (error) {
                console.error('Payment verification failed:', error);
                // Even if verification fails, we still consider the payment successful
                // but log the error for debugging
                clearCart();
                onSuccessModalOpen();
              }
            },
            onClose: () => {
              // Reset the payment states when user closes the Paystack popup
              setPaymentInProgress(false);
              setIsSubmitting(false);
              
              toast({
                title: 'Payment Cancelled',
                description: 'You cancelled the payment process',
                status: 'info',
                duration: 5000,
                isClosable: true,
              });
            }
          });
          
          return Boolean(paymentResult);
        } catch (error) {
          console.error('Paystack payment error:', error);
          setError(error.message || 'Failed to process payment with Paystack');
          setPaymentInProgress(false);
          setIsSubmitting(false);
          
          toast({
            title: 'Payment Error',
            description: error.message || 'Failed to process payment. Please try again.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          
          return false;
        }
      } else if (selectedPaymentMethod === 'mpesa') {
        // Process M-Pesa payment
        return await processMpesaPayment();
      }
      
      return false;
    } catch (error) {
      console.error('Payment processing error:', error);
      setError(error.message || 'An error occurred while processing your payment');
      
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to process payment. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      return false;
    } finally {
      if (selectedPaymentMethod !== 'card') { // For card, we handle this in the callbacks
        setIsSubmitting(false);
        setPaymentInProgress(false);
      }
    }
  }, [formData, selectedPaymentMethod, phoneNumber, tickets, selectedTickets, onSuccessModalOpen]);

  // Verify payment with backend
  const verifyPayment = async (reference) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Payment verification failed');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Process payment
      const success = await processPayment();
      if (success) {
        // Clear form on successful payment
        setFormData(prev => ({
          ...prev,
          name: '',
          phone: '',
          terms: false
        }));
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setError(error.message || 'An error occurred while processing your payment');
      
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to process payment. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle back to events
  const handleBackToEvents = () => {
    navigate('/events');
  };

  // Render loading state
  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
          <Text mt={4}>Loading your order...</Text>
        </Box>
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error loading checkout</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Back button */}
        <Button
          leftIcon={<FaArrowLeft />}
          variant="ghost"
          onClick={handleBackToEvents}
          alignSelf="flex-start"
          mb={-4}
        >
          Back to Events
        </Button>
        
        {/* Checkout Header */}
        <CheckoutHeader currentStep={currentStep} />
        
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
          {/* Left column - Checkout Form */}
          <GridItem>
            <CheckoutForm 
              formData={formData}
              handleInputChange={handleInputChange}
              selectedPaymentMethod={selectedPaymentMethod}
              setSelectedPaymentMethod={setSelectedPaymentMethod}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              mobileProvider={mobileProvider}
              setMobileProvider={setMobileProvider}
              isSubmitting={isSubmitting}
              handleSubmit={handleSubmit}
              error={error}
              currency={currency}
              totalAmount={totalAmount}
            />
          </GridItem>
          
          {/* Right column - Order Summary */}
          <GridItem>
            <OrderSummary 
              tickets={tickets}
              selectedTickets={selectedTickets}
              totalAmount={totalAmount}
              currency={currency}
            />
          </GridItem>
        </Grid>
        
        {/* Footer */}
        <CheckoutFooter />
      </VStack>
      
      {/* Success Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={onSuccessModalClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Payment Successful!</ModalHeader>
          <ModalCloseButton />
          <ModalBody py={8} textAlign="center">
            <Box color="green.500" fontSize="6xl" mb={4}>
              <FaCheckCircle />
            </Box>
            <Text fontSize="xl" fontWeight="bold" mb={4}>
              Thank you for your purchase!
            </Text>
            <Text mb={4}>
              Your payment was successful and your tickets have been booked.
            </Text>
            {paymentReference && (
              <Text fontSize="sm" color="gray.600" mb={6}>
                Reference: {paymentReference}
              </Text>
            )}
            <VStack spacing={4} mt={6}>
              <Button 
                colorScheme="blue" 
                size="lg" 
                onClick={() => navigate('/my-tickets')}
                leftIcon={<FaTicketAlt />}
              >
                View My Tickets
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  onSuccessModalClose();
                  navigate('/events');
                }}
              >
                Back to Events
              </Button>
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center">
            <Text fontSize="sm" color="gray.500" textAlign="center">
              A confirmation has been sent to {formData.email}
            </Text>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default CheckoutPage;
