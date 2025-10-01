import React, { useState } from 'react';
import { 
  VStack, 
  FormControl, 
  FormLabel, 
  Box,
  Input, 
  FormHelperText,
  Select,
  Checkbox,
  Text,
  Link,
  HStack
} from '@chakra-ui/react';
import { FaCreditCard } from 'react-icons/fa';

export const CheckoutForm = ({
  formData,
  handleInputChange,
  handleSubmit,
  isSubmitting,
  currency = 'KES',
  totalAmount = '0',
  selectedPaymentMethod = 'card',
  setSelectedPaymentMethod,
  phoneNumber = '',
  setPhoneNumber = () => {},
  mobileProvider = 'safaricom',
  setMobileProvider = () => {},
  error: propError = ''
}) => {
  const [errors, setErrors] = useState({}); // track errors per field

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email input with validation
  const handleEmailChange = (e) => {
    const { value } = e.target;
    handleInputChange(e);

    if (value && !validateEmail(value)) {
      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors((prev) => {
        const { email, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle payment method change
  const handlePaymentMethodChange = (value) => {
    setSelectedPaymentMethod(value);
  };

  // Handle phone number change with formatting
  const handlePhoneNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.startsWith('0') && value.length <= 10) {
      value = value.replace(/^(\d{3})(\d{0,3})(\d{0,4}).*/, '$1 $2 $3').trim();
    } else if (value.startsWith('254') && value.length <= 12) {
      value = value.replace(/^(254)(\d{0,2})(\d{0,3})(\d{0,4}).*/, '$1 $2 $3 $4').trim();
    } else if (value.startsWith('+')) {
      value = '254' + value.substring(1);
      value = value.replace(/^(254)(\d{0,2})(\d{0,3})(\d{0,4}).*/, '254 $2 $3 $4').trim();
    }
    
    setPhoneNumber(value);
    // Clear phone error if valid format
    setErrors((prev) => {
      const { phone, ...rest } = prev;
      return rest;
    });
  };

  // Handle mobile provider change
  const handleMobileProviderChange = (e) => {
    setMobileProvider(e.target.value);
  };
  
  // Format phone number for submission
  const formatPhoneForSubmission = (phone) => {
    if (!phone) return '';
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0') && formatted.length === 10) {
      return '254' + formatted.substring(1);
    } else if (formatted.startsWith('254') && formatted.length === 12) {
      return formatted;
    } else if (formatted.length === 9) {
      return '254' + formatted;
    }
    return formatted;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate email
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }
    const email = formData.email.trim().toLowerCase();
    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address (e.g., your@email.com)' });
      return;
    }

    // Validate phone if mpesa
    if (selectedPaymentMethod === 'mpesa') {
      const formattedPhone = formatPhoneForSubmission(phoneNumber);
      if (!formattedPhone || formattedPhone.length !== 12) {
        setErrors({ phone: 'Please enter a valid Kenyan phone number (e.g., 0712345678)' });
        return;
      }
      handleInputChange({ target: { name: 'phone', value: formattedPhone } });
    }

    // Validate terms for card payments
    if (selectedPaymentMethod === 'card' && !formData.terms) {
      setErrors({ terms: 'You must accept the terms and conditions' });
      return;
    }

    try {
      await handleSubmit(e, { ...formData, email });
    } catch (err) {
      console.error('Payment submission error:', err);
      setErrors({ form: err.message || 'Failed to process payment. Please try again.' });
    }
  };

  return (
    <Box as="form" onSubmit={handleFormSubmit} w="full">
      <VStack spacing={6} w="full" align="stretch">
        <Box w="full">
          <Text fontSize="lg" fontWeight="bold" color="gray.700" mb={4}>
            Contact Information
          </Text>
        </Box>

        {/* Email */}
        <FormControl id="email" isRequired isInvalid={!!errors.email}>
          <FormLabel>Email address</FormLabel>
          <Input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleEmailChange}
            placeholder="your@email.com"
            autoComplete="email"
            required
          />
          {errors.email && (
            <FormHelperText color="red.500">{errors.email}</FormHelperText>
          )}
        </FormControl>

        {/* Phone */}
        <FormControl id="phone" isRequired isInvalid={!!errors.phone}>
          <FormLabel>Phone Number</FormLabel>
          <Input 
            type="tel" 
            name="phone"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            placeholder="+254 7XX XXX XXX"
          />
          {errors.phone && (
            <FormHelperText color="red.500">{errors.phone}</FormHelperText>
          )}
        </FormControl>
      </VStack>

      {/* Payment Method */}
      <VStack spacing={4} w="full" align="stretch">
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          Payment Method
        </Text>
        <Select
          value={selectedPaymentMethod}
          onChange={(e) => handlePaymentMethodChange(e.target.value)}
          placeholder="Select payment method"
        >
          <option value="mpesa">M-Pesa</option>
          <option value="card">Credit/Debit Card</option>
          <option value="bank">Bank Transfer</option>
        </Select>
        
        {selectedPaymentMethod === 'mpesa' && (
          <VStack spacing={4} mt={4} align="stretch">
            <FormControl id="mobileProvider" isRequired>
              <FormLabel>Mobile Network</FormLabel>
              <Select
                value={mobileProvider}
                onChange={handleMobileProviderChange}
                placeholder="Select network"
              >
                <option value="safaricom">Safaricom M-Pesa</option>
                <option value="airtel">Airtel Money</option>
                <option value="mtn">MTN Mobile Money</option>
              </Select>
            </FormControl>
            
            <FormControl id="phoneNumber" isRequired isInvalid={!!errors.phone}>
              <FormLabel>Phone Number</FormLabel>
              <Input 
                type="tel" 
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="e.g. 0712 345 678"
              />
              <FormHelperText color={errors.phone ? "red.500" : "gray.500"}>
                {errors.phone || "We'll send an M-Pesa payment request to this number"}
              </FormHelperText>
            </FormControl>
          </VStack>
        )}
        
        {selectedPaymentMethod === 'card' && (
          <VStack spacing={4} mt={4} align="stretch">
            <Box 
              p={4} 
              bg="blue.50" 
              borderRadius="md" 
              borderLeft="4px" 
              borderColor="blue.500"
            >
              <HStack spacing={2} color="blue.700">
                <FaCreditCard />
                <Text fontWeight="medium">Secure Payment</Text>
              </HStack>
              <Text mt={2} fontSize="sm" color="gray.600">
                You'll be redirected to a secure payment page to complete your transaction.
              </Text>
            </Box>
            
            <FormControl id="cardName" isRequired>
              <FormLabel>Name on Card</FormLabel>
              <Input 
                type="text" 
                name="cardName"
                value={formData.cardName || ''}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </FormControl>
          </VStack>
        )}
      </VStack>

      {/* Terms and Conditions */}
      <FormControl id="terms" isRequired isInvalid={!!errors.terms}>
        <Checkbox 
          name="terms"
          isChecked={formData.terms}
          onChange={handleInputChange}
        >
          I agree to the{' '}
          <Link color="blue.500" href="/terms" isExternal>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link color="blue.500" href="/privacy" isExternal>
            Privacy Policy
          </Link>
        </Checkbox>
        {errors.terms && (
          <FormHelperText color="red.500">{errors.terms}</FormHelperText>
        )}
      </FormControl>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '0.375rem',
          fontWeight: '500',
          color: 'white',
          backgroundColor: '#2563eb',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.7 : 1,
          border: 'none',
          outline: 'none',
          transition: 'background-color 0.2s, opacity 0.2s',
        }}
      >
        {isSubmitting ? 'Processing...' : `Pay ${totalAmount}`}
      </button>
      
      {/* Global Form Error */}
      {(propError || errors.form) && (
        <Box 
          color="red.500"
          fontSize="sm"
          mt={2}
          textAlign="center"
          p={2}
          bg="red.50"
          borderRadius="md"
        >
          {propError || errors.form}
        </Box>
      )}
    </Box>
  );
};
