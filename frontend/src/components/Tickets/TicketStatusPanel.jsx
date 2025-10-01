import React from 'react';
import { Box, Text, Stack, Flex, Divider, Badge } from '@chakra-ui/react';

const TicketStatusPanel = ({ ticket, borderColor, sidePanelBg, secondaryText }) => {
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
          <Text>${typeof ticket.total_price === 'number' ? ticket.total_price.toFixed(2) : '0.00'}</Text>
        </Flex>
      </Stack>
    </Box>
  );
};

export default TicketStatusPanel;
