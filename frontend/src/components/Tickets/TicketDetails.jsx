import React from 'react';
import { Box, Text, Heading, Stack, Button, Badge, Flex, Icon, Divider } from '@chakra-ui/react';
import { CalendarIcon, TicketIcon, ArrowRightIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const TicketDetails = ({ ticket, secondaryText = 'gray.600', onViewDetails }) => {
  const getStatusColor = (status) => {
    const statusMap = {
      active: 'green',
      used: 'blue',
      expired: 'red',
      cancelled: 'gray'
    };
    return statusMap[status?.toLowerCase()] || 'gray';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    
    // Convert to number if it's a string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Format with commas and 2 decimal places
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numPrice);
  };

  return (
    <Box
      p={4}  // reduced from 6
      bg="white"
      borderRadius="lg" // smaller radius
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.100"
      transition="all 0.3s ease"
      _hover={{
        boxShadow: 'lg',
        transform: 'translateY(-2px)',
        borderColor: 'teal.200'
      }}
      position="relative"
      overflow="hidden"
    >
      {/* Accent bar */}
      <Box
        position="absolute"
        top={0}
        left={0}
        w="3px" // thinner
        h="full"
        bgGradient="linear(to-b, teal.400, blue.500)"
      />
      
      <Flex justify="space-between" align="flex-start" mb={2}> {/* reduced mb */}
        <Box flex={1}>
          <Heading 
            as="h2" 
            size="md" // smaller heading
            mb={1}   // reduced mb
            bgGradient="linear(to-r, teal.600, blue.600)"
            bgClip="text"
            fontWeight="bold"
          >
            {ticket.event?.name || 'Event Name'}
          </Heading>
          
          {ticket.status && (
            <Badge 
              colorScheme={getStatusColor(ticket.status)}
              variant="subtle"
              px={2}
              py={0.5} // smaller padding
              borderRadius="full"
              fontSize="xs"
              fontWeight="bold"
            >
              {ticket.status.toUpperCase()}
            </Badge>
          )}
        </Box>
        
        {/* Ticket icon */}
        <Box
          p={1.5} // smaller padding
          bg="teal.50"
          borderRadius="md"
          ml={3}
        >
          <Icon as={TicketIcon} w={5} h={5} color="teal.500" /> {/* reduced size */}
        </Box>
      </Flex>

      <Stack spacing={2}> {/* reduced spacing */}
        {/* Ticket Type */}
        <Flex align="center" gap={2}>
          <Box
            p={1.5}
            bg="blue.50"
            borderRadius="md"
          >
            <Icon as={TicketIcon} w={3.5} h={3.5} color="blue.500" /> {/* smaller */}
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="medium" color={secondaryText} textTransform="uppercase">
              Ticket Type
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
              {ticket.ticket_type?.name || 'General Admission'}
            </Text>
          </Box>
        </Flex>

        {/* Event Date */}
        <Flex align="center" gap={2}>
          <Box
            p={1.5}
            bg="purple.50"
            borderRadius="md"
          >
            <Icon as={CalendarIcon} w={3.5} h={3.5} color="purple.500" />
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="medium" color={secondaryText} textTransform="uppercase">
              Event Date & Time
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.800">
              {formatDate(ticket.event?.date)}
            </Text>
          </Box>
        </Flex>

        {/* Additional Info Section */}
        {(ticket.seat || ticket.section) && (
          <Flex gap={3} mt={1}>
            {ticket.seat && (
              <Box>
                <Text fontSize="xs" color={secondaryText}>Seat</Text>
                <Text fontSize="sm" fontWeight="semibold">{ticket.seat}</Text>
              </Box>
            )}
            {ticket.section && (
              <Box>
                <Text fontSize="xs" color={secondaryText}>Section</Text>
                <Text fontSize="sm" fontWeight="semibold">{ticket.section}</Text>
              </Box>
            )}
          </Flex>
        )}

        {/* Price Information */}
        <Flex align="center" gap={2} mt={2}>
          <Box
            p={1.5}
            bg="green.50"
            borderRadius="md"
          >
            <Icon as={CurrencyDollarIcon} w={3.5} h={3.5} color="green.500" />
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="medium" color={secondaryText} textTransform="uppercase">
              Price
            </Text>
            <Flex align="baseline" gap={1}>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {ticket.ticket_type?.price || ticket.price ? 
                  formatPrice(ticket.ticket_type?.price || ticket.price)
                  : 'Free'}
              </Text>
              {ticket.currency && ticket.currency !== 'KES' && (
                <Text fontSize="xs" color="gray.500" ml={1}>
                  ({ticket.currency})
                </Text>
              )}
            </Flex>
          </Box>
        </Flex>

        <Divider my={3} borderColor="gray.100" />

        {/* View Details Button */}
        <Flex justify="space-between" align="center" mt={2}>
          <Text fontSize="xs" color="gray.500" fontStyle="italic">
            {ticket.reference ? `Ref: ${ticket.reference}` : ''}
          </Text>
          <Button
            rightIcon={<ArrowRightIcon style={{ width: '14px', height: '14px' }} />}
            onClick={() => onViewDetails(ticket.id)}
            bgGradient="linear(to-r, teal.500, blue.500)"
            color="white"
            _hover={{
              bgGradient: 'linear(to-r, teal.600, blue.600)',
              transform: 'translateX(3px)',
              boxShadow: 'md'
            }}
            _active={{
              bgGradient: 'linear(to-r, teal.700, blue.700)'
            }}
            transition="all 0.2s ease"
            size="sm"
            fontWeight="semibold"
            borderRadius="md"
          >
            View Details
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
};

export default TicketDetails;
