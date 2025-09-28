import React from 'react';
import { Box, Text, Heading, Stack, Button, Badge, Flex, Icon } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
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
      p={6}
      bg="white"
      borderRadius="xl"
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
        w="4px"
        h="full"
        bgGradient="linear(to-b, teal.400, blue.500)"
      />
      
      <Flex justify="space-between" align="flex-start" mb={4}>
        <Box flex={1}>
          <Heading 
            as="h2" 
            size="lg" 
            mb={2}
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
              px={3}
              py={1}
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
          p={2}
          bg="teal.50"
          borderRadius="lg"
          ml={4}
        >
          <Icon as={TicketIcon} w={6} h={6} color="teal.500" />
        </Box>
      </Flex>

      <Stack spacing={4}>
        {/* Ticket Type */}
        <Flex align="center" gap={3}>
          <Box
            p={2}
            bg="blue.50"
            borderRadius="md"
          >
            <Icon as={TicketIcon} w={4} h={4} color="blue.500" />
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="medium" color={secondaryText} textTransform="uppercase">
              Ticket Type
            </Text>
            <Text fontWeight="semibold" color="gray.800">
              {ticket.ticket_type?.name || 'General Admission'}
            </Text>
          </Box>
        </Flex>

        {/* Event Date */}
        <Flex align="center" gap={3}>
          <Box
            p={2}
            bg="purple.50"
            borderRadius="md"
          >
            <Icon as={CalendarIcon} w={4} h={4} color="purple.500" />
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="medium" color={secondaryText} textTransform="uppercase">
              Event Date & Time
            </Text>
            <Text fontWeight="medium" color="gray.800">
              {formatDate(ticket.event?.date)}
            </Text>
          </Box>
        </Flex>

        {/* Additional Info Section */}
        {(ticket.seat || ticket.section) && (
          <Flex gap={4} mt={2}>
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
          rightIcon={<ArrowRightIcon style={{ width: '16px', height: '16px' }} />}
          onClick={() => onViewDetails(ticket.id)}
          alignSelf="flex-start"
          mt={4}
          bgGradient="linear(to-r, teal.500, blue.500)"
          color="white"
          _hover={{
            bgGradient: 'linear(to-r, teal.600, blue.600)',
            transform: 'translateX(4px)',
            boxShadow: 'lg'
          }}
          _active={{
            bgGradient: 'linear(to-r, teal.700, blue.700)'
          }}
          transition="all 0.2s ease"
          size="md"
          fontWeight="semibold"
          borderRadius="lg"
        >
          View Details
        </Button>
      </Stack>
    </Box>
  );
};

export default TicketDetails;