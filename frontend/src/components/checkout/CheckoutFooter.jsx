import React from 'react';
import { Box, Text, HStack, Link, Divider } from '@chakra-ui/react';
import { FaLock, FaShieldAlt, FaCreditCard } from 'react-icons/fa';

export const CheckoutFooter = () => {
  return (
    <Box mt={8} pt={4} borderTopWidth="1px">
      <VStack spacing={4}>
        <HStack spacing={6} color="gray.600" fontSize="sm">
          <HStack spacing={1}>
            <FaLock size={14} />
            <Text>Secure Payment</Text>
          </HStack>
          <HStack spacing={1}>
            <FaShieldAlt size={14} />
            <Text>SSL Encryption</Text>
          </HStack>
          <HStack spacing={1}>
            <FaCreditCard size={14} />
            <Text>No Card Data Stored</Text>
          </HStack>
        </HStack>
        
        <HStack spacing={4} fontSize="xs" color="gray.500">
          <Link href="/terms" _hover={{ textDecoration: 'underline' }}>Terms of Service</Link>
          <Text>•</Text>
          <Link href="/privacy" _hover={{ textDecoration: 'underline' }}>Privacy Policy</Link>
          <Text>•</Text>
          <Link href="/refund" _hover={{ textDecoration: 'underline' }}>Refund Policy</Link>
        </HStack>
        
        <Text fontSize="xs" color="gray.400" textAlign="center">
          © {new Date().getFullYear()} EventPulse. All rights reserved.
        </Text>
      </VStack>
    </Box>
  );
};

// VStack component is missing from the imports
const VStack = ({ children, ...props }) => (
  <Box display="flex" flexDirection="column" alignItems="center" {...props}>
    {children}
  </Box>
);
