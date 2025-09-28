import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Text,
  CircularProgress,
  VStack,
  HStack,
  Divider,
  useColorModeValue,
  Icon,
  Heading,
  Card,
  CardBody,
  Image,
  Flex,
  Badge,
  Grid
} from '@chakra-ui/react';
import { CheckCircleIcon, CalendarIcon, TimeIcon, InfoIcon } from '@chakra-ui/icons';
import { FiPrinter, FiList, FiMapPin } from 'react-icons/fi';
import { getTicket } from '../services/ticketService';

const TicketSuccess = () => {
  // All hooks must be called at the top level
  const location = useLocation();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const ticketBg = useColorModeValue('gray.50', 'gray.700');
  const footerBg = useColorModeValue('gray.50', 'gray.800');
  
  // Get order ID from URL
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('order');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await getTicket(orderId);
        setTicket(data);
      } catch (err) {
        setError('Failed to load ticket details');
        console.error('Error fetching ticket:', err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchTicket();
    } else {
      setLoading(false);
      setError('No order ID provided');
    }
  }, [orderId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={8}>
        <CircularProgress isIndeterminate color="teal.500" />
      </Box>
    );
  }

  if (error || !ticket) {
    return (
      <Container maxW="container.md" py={8}>
        <VStack spacing={4}>
          <Heading as="h1" size="lg" color="red.500">
            {error || 'Ticket not found'}
          </Heading>
          <Button colorScheme="teal" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </VStack>
      </Container>
    );
  }


  // Format date to match the design (e.g., "SAT, 15 MAY 2025")
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options).toUpperCase();
  };

  // Format time (e.g., "10:00 AM")
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <VStack spacing={4} textAlign="center">
          <Icon as={CheckCircleIcon} boxSize={12} color="green.500" />
          <Heading as="h1" size="xl">
            Thank You for Your Purchase!
          </Heading>
          <Text fontSize="lg" color="gray.500">
            Your ticket for <strong>{ticket.ticket_type?.event?.title}</strong> has been successfully purchased.
          </Text>
        </VStack>

        {/* Ticket Card */}
        <Card 
          borderWidth="1px" 
          borderColor={borderColor} 
          borderRadius="xl" 
          overflow="hidden"
          boxShadow="lg"
          position="relative"
        >
          {/* Ticket Header */}
          <Box 
            bgGradient="linear(to-r, blue.500, purple.600)" 
            p={6}
            color="white"
            position="relative"
          >
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontSize="sm" fontWeight="semibold" letterSpacing="wide">
                  {formatDate(ticket.ticket_type?.event?.date)}
                </Text>
                <Heading size="xl" mt={1}>
                  {ticket.ticket_type?.event?.title}
                </Heading>
                <HStack mt={2} spacing={4}>
                  <HStack>
                    <Icon as={CalendarIcon} />
                    <Text>{formatDate(ticket.ticket_type?.event?.date)}</Text>
                  </HStack>
                  <HStack>
                    <Icon as={TimeIcon} />
                    <Text>{formatTime(ticket.ticket_type?.event?.date)}</Text>
                  </HStack>
                </HStack>
              </Box>
              {ticket.qr_code && (
                <Box 
                  bg="white" 
                  p={2} 
                  borderRadius="md"
                  boxShadow="md"
                >
                  <Image 
                    src={ticket.qr_code} 
                    alt="QR Code" 
                    w="100px"
                    h="100px"
                  />
                </Box>
              )}
            </Flex>
          </Box>

          {/* Ticket Body */}
          <CardBody>
            <VStack spacing={6} align="stretch">
              {/* Event Location */}
              <Box>
                <HStack color="gray.500" mb={2}>
                  <Icon as={FiMapPin} />
                  <Text fontSize="sm" fontWeight="semibold">LOCATION</Text>
                </HStack>
                <Text fontSize="lg">{ticket.ticket_type?.event?.location || 'Venue not specified'}</Text>
              </Box>

              {/* Ticket Details */}
              <Box 
                bg={ticketBg} 
                p={4} 
                borderRadius="lg"
              >
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="semibold">TICKET</Text>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                    {ticket.ticket_type?.name || 'General Admission'}
                  </Badge>
                </HStack>
                
                <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Order #</Text>
                    <Text fontWeight="medium">{ticket.id?.split('-')[0].toUpperCase()}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Quantity</Text>
                    <Text fontWeight="medium">{ticket.quantity} {ticket.quantity > 1 ? 'Tickets' : 'Ticket'}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Total Amount</Text>
                    <Text fontWeight="bold" fontSize="lg">
                      ${ticket.total_price ? Number(ticket.total_price).toFixed(2) : '0.00'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Status</Text>
                    <HStack>
                      <Box w="8px" h="8px" bg="green.500" borderRadius="full" />
                      <Text fontWeight="medium">
                        {ticket.payment_method === 'cash' ? 'Pending Payment' : 'Paid'}
                      </Text>
                    </HStack>
                  </Box>
                </Grid>
              </Box>

              {/* Payment Method */}
              <Box>
                <HStack color="gray.500" mb={2}>
                  <Icon as={InfoIcon} />
                  <Text fontSize="sm" fontWeight="semibold">PAYMENT METHOD</Text>
                </HStack>
                <Text>
                  {ticket.payment_method === 'cash' 
                    ? 'Cash on Arrival' 
                    : 'Credit/Debit Card (Paid)'}
                </Text>
              </Box>
            </VStack>
          </CardBody>

          {/* Ticket Footer */}
          <Box 
            borderTopWidth="1px" 
            borderTopColor={borderColor}
            p={4}
            bg={footerBg}
          >
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Present this ticket at the entrance. For any questions, please contact support.
            </Text>
          </Box>
        </Card>

        {/* Action Buttons */}
        <HStack spacing={4} justify="center" mt={8}>
          <Button 
            colorScheme="blue" 
            onClick={() => window.print()}
            leftIcon={<Icon as={FiPrinter} />}
            size="lg"
          >
            Print Ticket
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/my-tickets')}
            leftIcon={<Icon as={FiList} />}
            size="lg"
          >
            View All Tickets
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
};

export default TicketSuccess;
