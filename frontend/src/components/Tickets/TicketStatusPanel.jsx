import React from 'react';
import { Box, Text, Stack, Flex, Divider, Badge } from '@chakra-ui/react';

// Currency symbol mapping for consistent display
const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'KES': 'KSh',
  'UGX': 'USh',
  'TZS': 'TSh',
  'NGN': '₦',
  'GHS': 'GH₵',
  'ZAR': 'R',
  'INR': '₹',
};

const TicketStatusPanel = ({ ticket, borderColor, sidePanelBg, secondaryText }) => {
  // Get currency symbol
  const getCurrencySymbol = (currency) => {
    return CURRENCY_SYMBOLS[currency] || currency || 'KSh';
  };

  // Calculate total price
  const calculateTotal = () => {
    if (!ticket.total_price || ticket.total_price === 0) {
      return 'Free';
    }
    
    const currencySymbol = getCurrencySymbol(ticket.currency);
    return `${currencySymbol} ${new Intl.NumberFormat('en-US').format(ticket.total_price)}`;
  };

  return (
    <Box 
      p={6} 
      bg={sidePanelBg}
      borderLeft={{ base: 'none', md: `1px solid` }}
      borderLeftColor={borderColor}
    >
      <Stack spacing={4}>
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color={secondaryText}>Status</Text>
          <Badge 
            colorScheme={
              ticket.status?.toLowerCase() === 'confirmed' ? 'green' : 
              ticket.status?.toLowerCase() === 'pending' ? 'yellow' : 'gray'
            }
            px={2}
            py={1}
            borderRadius="full"
            textTransform="capitalize"
          >
            {ticket.status || 'Unknown'}
          </Badge>
        </Flex>
        
        <Flex justify="space-between">
          <Text fontSize="sm" color={secondaryText}>Quantity</Text>
          <Text>{ticket.quantity}</Text>
        </Flex>
        
        <Divider />
        
        <Flex justify="space-between" fontWeight="bold">
          <Text>Total</Text>
          <Text>
            {calculateTotal()}
          </Text>
        </Flex>
      </Stack>
    </Box>
  );
};

export default TicketStatusPanel;
