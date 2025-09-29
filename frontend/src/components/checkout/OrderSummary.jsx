import React from 'react';
import { 
  VStack, 
  HStack, 
  Text, 
  Divider, 
  Box,
  Badge
} from '@chakra-ui/react';

export const OrderSummary = ({ tickets, selectedTickets, currency = 'KES' }) => {
  const calculateTotal = () => {
    if (!tickets || !Array.isArray(tickets)) return 0;
    
    return tickets.reduce((sum, ticket) => {
      const quantity = selectedTickets[ticket.id] || 0;
      return sum + (ticket.price * quantity);
    }, 0);
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const CURRENCY_SYMBOLS = {
    'KES': 'KSh',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
  };

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  
  if (!tickets || tickets.length === 0) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
        <Text>No items in cart</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" p={4} borderWidth="1px" borderRadius="lg" bg="white">
      <Text fontSize="xl" fontWeight="bold">Order Summary</Text>
      
      <VStack spacing={4} align="stretch" divider={<Divider />}>
        {tickets.map(ticket => {
          const quantity = selectedTickets[ticket.id] || 0;
          if (quantity === 0) return null;
          
          return (
            <HStack key={ticket.id} justify="space-between">
              <Box>
                <Text fontWeight="medium">{ticket.name}</Text>
                <Text fontSize="sm" color="gray.600">{ticket.event_name}</Text>
              </Box>
              <Box textAlign="right">
                <Text>{quantity} × {currencySymbol}{ticket.price.toFixed(2)}</Text>
                <Text fontSize="sm" color="gray.600">
                  {currencySymbol}{(ticket.price * quantity).toFixed(2)}
                </Text>
              </Box>
            </HStack>
          );
        })}
      </VStack>
      
      <Divider />
      
      <HStack justify="space-between" fontWeight="bold">
        <Text>Total</Text>
        <Text>{currencySymbol}{calculateTotal().toFixed(2)}</Text>
      </HStack>
      
      {tickets.some(t => t.remaining_quantity < 5 && t.remaining_quantity > 0) && (
        <Badge colorScheme="orange" mt={2} p={1} alignSelf="flex-start">
          Limited availability
        </Badge>
      )}
    </VStack>
  );
};
