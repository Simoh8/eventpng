import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  Image,
  Text,
  VStack,
  HStack,
  Badge,
  useToast,
  CircularProgress,
  Container
} from '@chakra-ui/react';
import { getTicket } from '../services/ticketService';

const TicketSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const ticketRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get order ID from query
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
        toast({
          title: 'Error',
          description: 'Failed to load ticket details.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/');
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
  }, [orderId, navigate, toast]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={8}>
        <CircularProgress isIndeterminate color="purple.500" />
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
          <Button colorScheme="purple" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Box maxW="400px" mx="auto" py={8} px={4}>
      {/* Ticket */}
      <div id="ticket" ref={ticketRef}>
        <Card
          borderRadius="20px"
          overflow="hidden"
          boxShadow="0 10px 30px rgba(0, 0, 0, 0.2)"
          border="2px solid"
          borderColor="purple.700"
          bg="white"
          position="relative"
        >
          {/* Header with Brand */}
          <Box
            bg="purple.600"
            color="white"
            py={4}
            px={6}
            textAlign="center"
            borderBottom="3px solid"
            borderColor="purple.700"
          >
            <Text fontSize="2xl" fontWeight="bold" letterSpacing="wide">
              EventPNG
            </Text>
          </Box>

          <CardBody p={0}>
            {/* Event Details */}
            <Box
              p={6}
              bg="gray.50"
              borderBottom="2px dashed"
              borderColor="gray.300"
            >
              <VStack spacing={4} align="stretch">
                {/* Ticket Type Badge */}
                <Badge
                  bg="purple.600"
                  color="white"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="bold"
                  alignSelf="center"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {ticket.ticket_type?.name || 'General Admission'}
                </Badge>

                {/* Event Title */}
                <Heading
                  size="lg"
                  textAlign="center"
                  fontWeight="black"
                  color="gray.800"
                  lineHeight="1.2"
                >
                  {ticket.ticket_type?.event?.title || 'Event Ticket'}
                </Heading>

                {/* Ticket ID */}
                <Box textAlign="center" mt={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color="gray.600"
                    letterSpacing="widest"
                    fontFamily="monospace"
                  >
                    TIC-{ticket.id?.toString().padStart(8, '0') || '00000000'}
                  </Text>
                </Box>
              </VStack>
            </Box>

            {/* QR Code Section */}
            <Box p={6} textAlign="center" bg="white">
              {ticket.qr_code ? (
                <>
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    color="red.500"
                    mb={4}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Do Not Share This QR Code
                  </Text>

                  <Box
                    p={4}
                    border="2px solid"
                    borderColor="purple.700"
                    borderRadius="12px"
                    display="inline-block"
                    mb={4}
                  >
                    <Image
                      src={ticket.qr_code}
                      alt="Ticket QR Code"
                      w="200px"
                      h="200px"
                    />
                  </Box>

                  <Text
                    fontSize="lg"
                    fontWeight="bold"
                    color="gray.800"
                    textTransform="uppercase"
                    letterSpacing="wide"
                    mb={2}
                  >
                    Attendee
                  </Text>

                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="gray.500"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Start
                  </Text>
                </>
              ) : (
                <Text color="gray.500">QR Code not available</Text>
              )}
            </Box>

            {/* Footer */}
            <Box p={4} bg="purple.600" color="white" textAlign="center">
              <VStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium">
                  {ticket.ticket_type?.event?.date
                    ? new Date(ticket.ticket_type?.event?.date).toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )
                    : 'Date not specified'}
                </Text>
                {ticket.ticket_type?.event?.time && (
                  <Text fontSize="sm" opacity="0.9">
                    {ticket.ticket_type?.event?.time}
                  </Text>
                )}
                {ticket.ticket_type?.event?.location && (
                  <Text fontSize="xs" opacity="0.9">
                    {ticket.ticket_type?.event?.location}
                  </Text>
                )}
              </VStack>
            </Box>
          </CardBody>
        </Card>
      </div>

      {/* Action Buttons */}
      <HStack spacing={4} mt={6} w="100%">
        <Button
          bg="purple.600"
          color="white"
          _hover={{
            bg: 'purple.700',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          }}
          _active={{
            bg: 'purple.800',
          }}
          size="lg"
          flex="1"
          borderRadius="full"
          fontWeight="bold"
          onClick={handlePrint}
        >
          Print Ticket
        </Button>

        <Button
          variant="outline"
          borderColor="purple.400"
          color="purple.600"
          _hover={{
            bg: 'purple.50',
            borderColor: 'purple.600',
          }}
          size="md"
          flex="1"
          borderRadius="full"
          onClick={() => navigate('/my-tickets')}
        >
          Back to Tickets
        </Button>
      </HStack>
    </Box>
  );
};

export default TicketSuccess;
