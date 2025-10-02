import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  SimpleGrid,
} from '@chakra-ui/react';
import { getTicket } from '../services/ticketService';

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

const TicketDetail = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();
  const ticketRef = useRef(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await getTicket(id);
        setTicket(data);
      } catch (error) {
        console.error('Error fetching ticket:', error);
        toast({
          title: 'Error',
          description: 'Failed to load ticket details.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/tickets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [id, navigate, toast]);

  // Get currency symbol
  const getCurrencySymbol = (currency) => {
    return CURRENCY_SYMBOLS[currency] || currency || 'KSh';
  };

  // Format price
  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numPrice);
  };

  // Calculate unit price
  const getUnitPrice = () => {
    if (!ticket) return 0;
    const quantity = Number(ticket.quantity || 0);
    const totalPrice = Number(ticket.total_price || 0);

    if (quantity > 0 && totalPrice > 0) {
      return totalPrice / quantity;
    }

    return Number(ticket.ticket_type?.price || ticket.price || 0);
  };

  // ✅ Clean print handler
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <Box p={8}>Loading ticket details...</Box>;
  }

  if (!ticket) {
    return <Box p={8}>Ticket not found</Box>;
  }

  const currencySymbol = getCurrencySymbol(ticket.currency);
  const unitPrice = getUnitPrice();

  return (
    <Box maxW="400px" mx="auto" py={8} px={4}>
      {/* Ticket Only */}
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
          {/* Header Section with Brand */}
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
            {/* Event Details Section */}
            <Box p={6} bg="gray.50" borderBottom="2px dashed" borderColor="gray.300">
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
                <Heading size="lg" textAlign="center" fontWeight="black" color="gray.800" lineHeight="1.2">
                  {ticket.event?.title || ticket.event?.name || 'Event Ticket'}
                </Heading>

                {/* Ticket Details Grid */}
                <SimpleGrid columns={2} spacing={3} mt={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" textTransform="uppercase" fontWeight="bold">
                      Quantity
                    </Text>
                    <Text fontSize="md" fontWeight="semibold" color="gray.800">
                      {ticket.quantity || 1}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="gray.600" textTransform="uppercase" fontWeight="bold">
                      Status
                    </Text>
                    <Badge
                      colorScheme={
                        ticket.status?.toLowerCase() === 'confirmed' ? 'green' :
                        ticket.status?.toLowerCase() === 'pending' ? 'yellow' : 'gray'
                      }
                      fontSize="xs"
                      textTransform="capitalize"
                    >
                      {ticket.status || 'Unknown'}
                    </Badge>
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="gray.600" textTransform="uppercase" fontWeight="bold">
                      Unit Price
                    </Text>
                    <Text fontSize="md" fontWeight="semibold" color="gray.800">
                      {unitPrice > 0 ? `${currencySymbol} ${formatPrice(unitPrice)}` : 'Free'}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="gray.600" textTransform="uppercase" fontWeight="bold">
                      Total
                    </Text>
                    <Text fontSize="md" fontWeight="bold" color="purple.600">
                      {ticket.total_price > 0
                        ? `${currencySymbol} ${formatPrice(ticket.total_price)}`
                        : 'Free'
                      }
                    </Text>
                  </Box>
                </SimpleGrid>

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

                  <Text fontSize="lg" fontWeight="bold" color="gray.800" textTransform="uppercase" letterSpacing="wide" mb={2}>
                    Attendee
                  </Text>

                  <Text fontSize="sm" fontWeight="medium" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                    Start
                  </Text>
                </>
              ) : (
                <Text color="gray.500">QR Code not available</Text>
              )}
            </Box>

            {/* Event Info Footer */}
            <Box p={4} bg="purple.600" color="white" textAlign="center">
              <VStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium">
                  {ticket.event?.date
                    ? new Date(ticket.event.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Date not specified'}
                </Text>
                {ticket.event?.time && (
                  <Text fontSize="sm" opacity="0.9">{ticket.event.time}</Text>
                )}
                {ticket.event?.location && (
                  <Text fontSize="xs" opacity="0.9">{ticket.event.location}</Text>
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
            bg: "purple.700",
            transform: "translateY(-2px)",
            boxShadow: "lg"
          }}
          _active={{
            bg: "purple.800"
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
            bg: "purple.50",
            borderColor: "purple.600"
          }}
          size="md"
          flex="1"
          borderRadius="full"
          onClick={() => navigate('/tickets')}
        >
          Back to Tickets
        </Button>
      </HStack>
    </Box>
  );
};

export default TicketDetail;
