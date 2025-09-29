import React, { useState } from 'react';
import { 
  VStack, 
  FormControl, 
  FormLabel, 
  Box,
  Input, 
  FormHelperText,
  Select,
  Textarea,
  Checkbox,
  Text,
  Link,
  HStack
} from '@chakra-ui/react';
import { FaCreditCard } from 'react-icons/fa';

/**
 * CheckoutForm - Form for collecting payment and contact information
 * 
 * @param {Object} formData - Form data object with fields like email, name, etc.
 * @param {Function} handleInputChange - Handler for input changes
 * @param {Function} handleSubmit - Form submission handler
 * @param {boolean} isSubmitting - Whether the form is currently submitting
 * @param {string} currency - Currency code (e.g., 'KES', 'USD')
 * @param {string} totalAmount - Formatted total amount with currency symbol
 * @param {string} selectedPaymentMethod - Currently selected payment method
 * @param {Function} setSelectedPaymentMethod - Function to update the selected payment method
 * @param {string} phoneNumber - User's phone number
 * @param {Function} setPhoneNumber - Function to update the phone number
 * @param {string} mobileProvider - Selected mobile money provider
 * @param {Function} setMobileProvider - Function to update the mobile provider
 * @param {string} error - Error message to display, if any
 */
/**
 * CheckoutForm - Form for collecting payment and contact information
 * 
 * @param {Object} formData - Form data object with fields like email, name, etc.
 * @param {Function} handleInputChange - Handler for input changes
 * @param {Function} handleSubmit - Form submission handler
 * @param {boolean} isSubmitting - Whether the form is currently submitting
 * @param {string} currency - Currency code (e.g., 'KES', 'USD')
 * @param {string} totalAmount - Formatted total amount with currency symbol
 * @param {string} selectedPaymentMethod - Currently selected payment method
 * @param {Function} setSelectedPaymentMethod - Function to update the selected payment method
 * @param {string} phoneNumber - User's phone number
 * @param {Function} setPhoneNumber - Function to update the phone number
 * @param {string} mobileProvider - Selected mobile money provider
 * @param {Function} setMobileProvider - Function to update the mobile provider
 * @param {string} error - Error message to display, if any
 */
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
  const [localError, setLocalError] = useState('');
  const error = propError || localError;
  // Handle payment method change
  const handlePaymentMethodChange = (value) => {
    setSelectedPaymentMethod(value);
  };

  // Handle phone number change with formatting
  const handlePhoneNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format as Kenyan phone number if it starts with 0 or 254
    if (value.startsWith('0') && value.length <= 10) {
      // Format as 0XX XXX XXXX
      value = value.replace(/^(\d{3})(\d{0,3})(\d{0,4}).*/, '$1 $2 $3').trim();
    } else if (value.startsWith('254') && value.length <= 12) {
      // Format as 254 XX XXX XXXX
      value = value.replace(/^(254)(\d{0,2})(\d{0,3})(\d{0,4}).*/, '$1 $2 $3 $4').trim();
    } else if (value.startsWith('+')) {
      // Remove + and format as 254
      value = '254' + value.substring(1);
      value = value.replace(/^(254)(\d{0,2})(\d{0,3})(\d{0,4}).*/, '254 $2 $3 $4').trim();
    }
    
    setPhoneNumber(value);
  };

  // Handle mobile provider change
  const handleMobileProviderChange = (e) => {
    setMobileProvider(e.target.value);
  };
  
  // Format phone number for submission
  const formatPhoneForSubmission = (phone) => {
    if (!phone) return '';
    // Remove all non-digit characters and ensure it starts with 254
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0') && formatted.length === 10) {
      return '254' + formatted.substring(1);
    } else if (formatted.startsWith('254') && formatted.length === 12) {
      return formatted;
    } else if (formatted.length === 9) {
      return '254' + formatted;
    }
    return formatted; // Return as is if format is unknown
  };

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setLocalError(''); // Clear any previous errors
    
    // Format phone number before submission if using M-Pesa
    if (selectedPaymentMethod === 'mpesa') {
      const formattedPhone = formatPhoneForSubmission(phoneNumber);
      if (!formattedPhone || formattedPhone.length !== 12) {
        setLocalError('Please enter a valid Kenyan phone number (e.g., 0712345678)');
        return;
      }
      setPhoneNumber(formattedPhone);
    }
    
    handleSubmit(e);
  };

  return (
    <VStack spacing={6} as="form" onSubmit={handleFormSubmit}>
      {/* Personal Information */}
      <VStack spacing={4} w="full" align="stretch">
        <Text fontSize="lg" fontWeight="bold" color="gray.700">
          Contact Information
        </Text>
        
        <FormControl id="email" isRequired>
          <FormLabel>Email address</FormLabel>
          <Input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="you@example.com"
          />
          <FormHelperText>We'll send your receipt to this email.</FormHelperText>
        </FormControl>
        <FormControl id="phone" isRequired>
          <FormLabel>Phone Number</FormLabel>
          <Input 
            type="tel" 
            name="phone"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            placeholder="+254 7XX XXX XXX"
          />
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
                bg="white"
                borderColor="gray.300"
                _hover={{ borderColor: 'blue.400' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
              >
                <option value="safaricom">Safaricom M-Pesa</option>
                <option value="airtel">Airtel Money</option>
                <option value="mtn">MTN Mobile Money</option>
              </Select>
            </FormControl>
            
            <FormControl id="phoneNumber" isRequired>
              <FormLabel>Phone Number</FormLabel>
              <Input 
                type="tel" 
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="e.g. 0712 345 678"
                bg="white"
                borderColor="gray.300"
                _hover={{ borderColor: 'blue.400' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
              />
              <FormHelperText color="gray.500">
                We'll send an M-Pesa payment request to this number
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
                bg="white"
                borderColor="gray.300"
                _hover={{ borderColor: 'blue.400' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
              />
            </FormControl>
          </VStack>
        )}
      </VStack>

      {/* Terms and Conditions */}
      <FormControl id="terms" isRequired>
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
      </FormControl>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3 px-4 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting ? 'Processing...' : `Pay ${totalAmount}`}
      </button>
    </VStack>
  );
};
