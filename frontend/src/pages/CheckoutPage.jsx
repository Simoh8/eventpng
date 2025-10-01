import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Box, 
  VStack, 
  Text, 
  useToast,
  Spinner,
  Container,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Checkbox,
  Card,
  CardBody,
  CardHeader,
  Heading
} from '@chakra-ui/react';
import { FaArrowLeft, FaLock, FaTicketAlt, FaCheckCircle, FaEnvelope, FaUser, FaPhone } from 'react-icons/fa';
import { processPaystackPayment } from '../utils/paystack';

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

const CheckoutPage = () => {
  // Payment state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
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
  
  // Get ticket type and currency
  const { ticketType, currency } = useMemo(() => {
    if (!tickets || !tickets.length) return { ticketType: 'paid', currency: 'KES' };
    
    // Check if all tickets are free
    const allFree = tickets.every(t => !t.price || Number(t.price) <= 0);
    // Check if any ticket is RSVP type
    const hasRSVP = tickets.some(t => t.ticket_type?.toLowerCase() === 'rsvp');
    
    return {
      ticketType: hasRSVP ? 'rsvp' : (allFree ? 'free' : 'paid'),
      currency: tickets[0]?.currency || 'KES'
    };
  }, [tickets]);
  
  // Determine if payment is required
  const paymentRequired = useMemo(() => {
    return ticketType === 'paid';
  }, [ticketType]);

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
        currency: ticket.currency || 'KES',
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

  // Process ticket order (payment or RSVP/Free registration)
  const processTicketOrder = useCallback(async () => {
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address to continue',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }

    // Only require phone number for payments
    if (paymentRequired && !formData.phone) {
      setError('Please enter your phone number for payment verification');
      return false;
    }

    try {
      // For free or RSVP tickets, we don't process payment
      if (!paymentRequired) {
        // Process free/RSVP ticket registration
        const ticketDetails = Object.entries(selectedTickets)
          .filter(([_, qty]) => qty > 0)
          .map(([ticketId, qty]) => {
            const ticket = tickets.find(t => t.id === ticketId);
            return {
              id: ticketId,
              name: ticket?.name || `Ticket ${ticketId}`,
              quantity: qty,
              price: 0,
              type: ticketType
            };
          });
        
        // Simulate API call to register tickets
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clear cart and show success
        clearCart();
        setSuccess(true);
        onSuccessModalOpen();
        return true;
      }
      
      // For paid tickets, process payment with Paystack
      const amount = tickets.reduce((sum, ticket) => {
        const quantity = selectedTickets[ticket.id] || 0;
        return sum + (ticket.price * quantity);
      }, 0);

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
            ticket_ids: tickets.map(t => t.id).join(','),
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
              clearCart();
              onSuccessModalOpen();
            }
          },
          onClose: () => {
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
    }
  }, [formData, tickets, selectedTickets, onSuccessModalOpen]);

  // Verify payment with backend
  const verifyPayment = async (reference) => {
    try {
      const response = await fetch(`/api/payments/paystack/verify/${reference}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Payment verification failed');
      }
      
      toast({
        title: 'Payment Verified',
        description: data.message || 'Your payment has been verified and your ticket has been issued.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      return data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      
      toast({
        title: 'Verification Error',
        description: error.message || 'There was an issue verifying your payment. Please contact support if the problem persists.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const success = await processTicketOrder();
      if (success) {
        setFormData(prev => ({
          ...prev,
          name: '',
          phone: '',
          terms: false
        }));
      }
    } catch (error) {
      console.error('Order processing error:', error);
      setError(error.message || 'An error occurred while processing your order');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to process your order. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back to events
  const handleBackToEvents = () => {
    navigate('/events');
  };

  // Render loading state
  if (isLoading) {
    return (
      <Container maxW="container.sm" py={8}>
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
      <Container maxW="container.sm" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error loading checkout</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.sm" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Back button */}
        <Button
          leftIcon={<FaArrowLeft />}
          variant="ghost"
          onClick={handleBackToEvents}
          alignSelf="flex-start"
          size="sm"
        >
          Back to Events
        </Button>
        
        {/* Header Card */}
        <Card shadow="md" border="1px" borderColor="gray.100">
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="lg" textAlign="center" color="blue.600">
                Checkout
              </Heading>
              
              {!paymentRequired && (
                <Alert status="info" borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="medium">
                      {ticketType === 'rsvp' ? 'RSVP Event' : 'Free Event'}
                    </Text>
                    <Text fontSize="sm">
                      {ticketType === 'rsvp' 
                        ? 'No payment required - confirm your attendance' 
                        : 'No payment required - register for free'}
                    </Text>
                  </Box>
                </Alert>
              )}
              
              {paymentRequired && (
                <Box textAlign="center" py={2}>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">
                    {totalAmount}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Total Amount
                  </Text>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Checkout Form Card */}
        <Card shadow="md" border="1px" borderColor="gray.100">
          <CardHeader pb={0}>
            <Heading size="md" color="gray.700">
              Contact Information
            </Heading>
          </CardHeader>
          <CardBody>
            <Box as="form" onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    <FaUser style={{ display: 'inline', marginRight: '8px' }} />
                    Full Name
                  </FormLabel>
                  <Input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                    size="md"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    <FaEnvelope style={{ display: 'inline', marginRight: '8px' }} />
                    Email Address
                  </FormLabel>
                  <Input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    size="md"
                    focusBorderColor="blue.500"
                  />
                </FormControl>
                
                <FormControl isRequired={paymentRequired}>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    <FaPhone style={{ display: 'inline', marginRight: '8px' }} />
                    Phone Number
                  </FormLabel>
                  <Input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. 0712345678"
                    size="md"
                    focusBorderColor="blue.500"
                  />
                  {paymentRequired && (
                    <FormHelperText fontSize="xs">
                      Required for payment verification and updates
                    </FormHelperText>
                  )}
                </FormControl>
              </VStack>
              
              {/* Terms and Conditions */}
              <FormControl isRequired mt={6} mb={4}>
                <Checkbox 
                  name="terms" 
                  isChecked={formData.terms}
                  onChange={handleInputChange}
                  colorScheme="blue"
                  size="md"
                >
                  <Text fontSize="sm">
                    I agree to the Terms of Service and Privacy Policy
                  </Text>
                </Checkbox>
              </FormControl>
              
              {/* Submit Button */}
              <Button
                type="submit"
                colorScheme={paymentRequired ? 'blue' : 'green'}
                size="lg"
                width="100%"
                height="50px"
                borderRadius="md"
                fontSize="md"
                fontWeight="semibold"
                leftIcon={paymentRequired ? <FaLock /> : <FaTicketAlt />}
                isLoading={isSubmitting}
                loadingText={paymentRequired ? 'Processing Payment...' : 'Processing...'}
                isDisabled={!formData.terms || isSubmitting || (paymentRequired && !formData.phone)}
                mt={4}
              >
                {paymentRequired 
                  ? `Pay ${totalAmount} Securely` 
                  : ticketType === 'rsvp' 
                    ? 'Complete RSVP' 
                    : 'Get Free Ticket'}
              </Button>
              
              {paymentRequired && (
                <Text mt={3} fontSize="xs" color="gray.500" textAlign="center">
                  <FaLock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                  Your payment is secure and encrypted with Paystack
                </Text>
              )}
            </Box>
          </CardBody>
        </Card>
        
        {/* Security Note */}
        <Box textAlign="center">
          <Text fontSize="xs" color="gray.500">
            🔒 Your information is secure and will not be shared with third parties
          </Text>
        </Box>
      </VStack>
      
      {/* Success Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={onSuccessModalClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center" pb={2}>
            {ticketType === 'rsvp' ? 'RSVP Confirmed!' : 'Success!'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody textAlign="center" py={6}>
            <Box color="green.500" mb={4}>
              <FaCheckCircle size={48} />
            </Box>
            <Text fontSize="lg" fontWeight="semibold" mb={2}>
              {ticketType === 'rsvp' 
                ? "You're on the list!" 
                : paymentRequired 
                  ? 'Payment Successful!' 
                  : 'Registration Complete!'}
            </Text>
            <Text color="gray.600" mb={6} fontSize="sm">
              {ticketType === 'rsvp' 
                ? 'Your spot has been reserved. We look forward to seeing you at the event!'
                : paymentRequired
                  ? 'Your payment has been processed and your tickets are confirmed.'
                  : 'Your tickets have been registered successfully.'}
            </Text>
            <VStack spacing={3}>
              <Button 
                colorScheme="blue" 
                width="100%"
                onClick={() => {
                  onSuccessModalClose();
                  navigate('/my-tickets');
                }}
              >
                View My Tickets
              </Button>
              <Button 
                variant="outline" 
                width="100%"
                onClick={() => {
                  onSuccessModalClose();
                  navigate('/events');
                }}
              >
                Browse More Events
              </Button>
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center" pt={0}>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              A confirmation has been sent to {formData.email}
            </Text>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default CheckoutPage;