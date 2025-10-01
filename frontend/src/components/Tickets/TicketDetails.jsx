import React from 'react';
import { Box, Text, Heading, Stack, Button, Badge, Flex, Icon } from '@chakra-ui/react';
import { CalendarIcon, TicketIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

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

        {/* View Details Button */}
        <Button
          rightIcon={<ArrowRightIcon style={{ width: '14px', height: '14px' }} />}
          onClick={() => onViewDetails(ticket.id)}
          alignSelf="flex-start"
          mt={2} // reduced margin top
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
          size="sm" // smaller button
          fontWeight="semibold"
          borderRadius="md"
        >
          View Details
        </Button>
      </Stack>
    </Box>
  );
};

export default TicketDetails;
