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
  Center,
  useColorModeValue
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

  // Enhanced color scheme
  const bgGradient = useColorModeValue(
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #4c1d95 0%, #7c2d12 100%)'
  );

  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const accentColor = useColorModeValue('purple.500', 'purple.300');

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

  // Enhanced print handler
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Center minH="400px">
        <VStack spacing={4}>
          <Box
            w="40px"
            h="40px"
            border="4px solid"
            borderColor="purple.200"
            borderTopColor="purple.500"
            borderRadius="50%"
            animation="spin 1s linear infinite"
          />
          <Text color="gray.600">Loading your ticket...</Text>
        </VStack>
      </Center>
    );
  }

  if (!ticket) {
    return (
      <Center minH="400px">
        <VStack spacing={4}>
          <Text fontSize="2xl" color="gray.400">🎫</Text>
          <Text color="gray.600">Ticket not found</Text>
        </VStack>
      </Center>
    );
  }

  const currencySymbol = getCurrencySymbol(ticket.currency);
  const unitPrice = getUnitPrice();

  return (
    <Box maxW="380px" mx="auto" py={4} px={3}>
      {/* Compact Ticket Design */}
      <div id="ticket" ref={ticketRef}>
        <Card
          borderRadius="16px"
          overflow="hidden"
          boxShadow="0 15px 30px rgba(0, 0, 0, 0.12)"
          border="none"
          bg={cardBg}
          position="relative"
          transition="all 0.3s ease"
          _hover={{
            transform: 'scale(1.02)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}
        >
          {/* Decorative rainbow border */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="4px"
            bgGradient="linear(to-r, #ff6b6b, #ffa500, #ffff00, #32cd32, #1e90ff, #9370db)"
          />

          {/* Compact Header */}
          <Box
            bgGradient={bgGradient}
            color="white"
            py={4}
            px={4}
            textAlign="center"
            position="relative"
            overflow="hidden"
          >
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              opacity={0.1}
              bgImage="radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)"
            />

            <VStack position="relative" zIndex={1} spacing={1}>
              <Text
                fontSize="2xl"
                fontWeight="900"
                letterSpacing="widest"
                textShadow="0 2px 4px rgba(0,0,0,0.3)"
              >
                🎫 EventPNG
              </Text>
              <Text
                fontSize="xs"
                opacity={0.9}
                fontWeight="500"
                letterSpacing="wide"
              >
                Premium Event Ticket
              </Text>
            </VStack>
          </Box>

          <CardBody p={0}>
            {/* Compact Event Details */}
            <Box
              p={4}
              bgGradient="linear(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)"
              borderBottom="2px dashed"
              borderColor="gray.300"
            >
              <VStack spacing={3} align="stretch">
                {/* Compact Ticket Badge */}
                <Box position="relative">
                  <Badge
                    bgGradient="linear(to-r, purple.500, pink.500)"
                    color="white"
                    px={4}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="bold"
                    alignSelf="center"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    boxShadow="0 2px 8px rgba(168, 85, 247, 0.4)"
                  >
                    {ticket.ticket_type?.name || 'General Admission'}
                  </Badge>
                </Box>

                {/* Compact Event Title */}
                <Box textAlign="center">
                  <Heading
                    size="md"
                    fontWeight="800"
                    color={textColor}
                    lineHeight="1.2"
                    textShadow="0 1px 2px rgba(0,0,0,0.1)"
                  >
                    {ticket.event?.title || ticket.event?.name || 'Event Ticket'}
                  </Heading>
                </Box>

                {/* Compact Ticket Details Grid */}
                <SimpleGrid columns={2} spacing={3}>
                  <Box
                    p={2}
                    bg="white"
                    borderRadius="8px"
                    boxShadow="0 2px 6px rgba(0,0,0,0.08)"
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                      fontWeight="bold"
                      mb={1}
                      letterSpacing="wide"
                    >
                      Qty
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="purple.600">
                      {ticket.quantity || 1}×</Text>
                  </Box>

                  <Box
                    p={2}
                    bg="white"
                    borderRadius="8px"
                    boxShadow="0 2px 6px rgba(0,0,0,0.08)"
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                      fontWeight="bold"
                      mb={1}
                      letterSpacing="wide"
                    >
                      Status
                    </Text>
                    <Badge
                      colorScheme={
                        ticket.status?.toLowerCase() === 'confirmed' ? 'green' :
                        ticket.status?.toLowerCase() === 'pending' ? 'yellow' : 'gray'
                      }
                      fontSize="xs"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      textTransform="capitalize"
                    >
                      {ticket.status || 'Unknown'}
                    </Badge>
                  </Box>

                  <Box
                    p={2}
                    bg="white"
                    borderRadius="8px"
                    boxShadow="0 2px 6px rgba(0,0,0,0.08)"
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      textTransform="uppercase"
                      fontWeight="bold"
                      mb={1}
                      letterSpacing="wide"
                    >
                      Unit Price
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                      {unitPrice > 0 ? `${currencySymbol} ${formatPrice(unitPrice)}` : 'Free'}
                    </Text>
                  </Box>

                  <Box
                    p={2}
                    bgGradient="linear(to-br, purple.500, pink.500)"
                    borderRadius="8px"
                    boxShadow="0 4px 12px rgba(168, 85, 247, 0.3)"
                    color="white"
                  >
                    <Text
                      fontSize="xs"
                      textTransform="uppercase"
                      fontWeight="bold"
                      mb={1}
                      letterSpacing="wide"
                      opacity={0.9}
                    >
                      Total
                    </Text>
                    <Text fontSize="lg" fontWeight="900">
                      {ticket.total_price > 0
                        ? `${currencySymbol} ${formatPrice(ticket.total_price)}`
                        : 'Free'
                      }
                    </Text>
                  </Box>
                </SimpleGrid>

                {/* Compact Ticket ID */}
                <Box
                  textAlign="center"
                  p={2}
                  bgGradient="linear(to-r, gray.50, gray.100)"
                  borderRadius="6px"
                  border="1px dashed"
                  borderColor="gray.300"
                >
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textTransform="uppercase"
                    fontWeight="bold"
                    mb={0.5}
                    letterSpacing="wide"
                  >
                    Ticket ID
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color="gray.700"
                    letterSpacing="widest"
                    fontFamily="monospace"
                  >
                    TIC-{ticket.id?.toString().padStart(8, '0') || '00000000'}
                  </Text>
                </Box>
              </VStack>
            </Box>

            {/* Compact QR Code Section */}
            <Box
              p={4}
              textAlign="center"
              bgGradient="linear(135deg, #f8fafc 0%, #e2e8f0 100%)"
              position="relative"
            >
              {ticket.qr_code ? (
                <VStack spacing={3}>
                  <Box position="relative">
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      color="red.400"
                      textTransform="uppercase"
                      letterSpacing="widest"
                      position="absolute"
                      top="-12px"
                      left="50%"
                      transform="translateX(-50%)"
                    >
                    </Text>

                    <Box
                      p={3}
                      bg="white"
                      border="2px solid"
                      borderColor="purple.600"
                      borderRadius="12px"
                      display="inline-block"
                      boxShadow="0 6px 15px rgba(168, 85, 247, 0.2)"
                    >
                      <Image
                        src={ticket.qr_code}
                        alt="Ticket QR Code"
                        w="120px"
                        h="120px"
                        borderRadius="8px"
                      />
                    </Box>
                  </Box>

                  <VStack spacing={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={textColor}
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      🎫 Ready for Entry
                    </Text>

                    <Text
                      fontSize="xs"
                      color="gray.600"
                      textTransform="uppercase"
                      letterSpacing="wide"
                      opacity={0.8}
                    >
                      Scan at entrance
                    </Text>
                  </VStack>
                </VStack>
              ) : (
                <VStack spacing={2}>
                  <Box w="120px" h="120px" bg="gray.200" borderRadius="8px" />
                  <Text color="gray.500" fontSize="xs">QR Code not available</Text>
                </VStack>
              )}
            </Box>

            {/* Compact Event Info Footer */}
            <Box
              p={3}
              bgGradient="linear(to-r, purple.600, pink.600)"
              color="white"
              textAlign="center"
            >
              <VStack spacing={1}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textShadow="0 1px 2px rgba(0,0,0,0.3)"
                >
                  {ticket.event?.date
                    ? new Date(ticket.event.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Date not specified'}
                </Text>
                {ticket.event?.time && (
                  <Text fontSize="xs" opacity={0.9}>⏰ {ticket.event.time}</Text>
                )}
                {ticket.event?.location && (
                  <Text fontSize="xs" opacity={0.9}>📍 {ticket.event.location}</Text>
                )}
              </VStack>
            </Box>
          </CardBody>
        </Card>
      </div>

      {/* Compact Action Buttons */}
      <HStack spacing={3} mt={4} w="100%">
        <Button
          bgGradient="linear(to-r, purple.500, pink.500)"
          color="white"
          _hover={{
            bgGradient: 'linear(to-r, purple.600, pink.600)',
            transform: "translateY(-1px)",
            boxShadow: "lg"
          }}
          size="md"
          flex="1"
          borderRadius="full"
          fontWeight="bold"
          fontSize="sm"
          h="44px"
          onClick={handlePrint}
          boxShadow="0 2px 8px rgba(168, 85, 247, 0.3)"
        >
          🖨️ Print
        </Button>

        <Button
          variant="outline"
          border="1px solid"
          borderColor="purple.300"
          color="purple.600"
          bg="white"
          _hover={{
            bg: "purple.50",
            borderColor: "purple.500",
            transform: "translateY(-1px)",
            boxShadow: "md"
          }}
          size="md"
          flex="1"
          borderRadius="full"
          fontWeight="semibold"
          fontSize="sm"
          h="44px"
          onClick={() => navigate('/tickets')}
        >
          ← Back
        </Button>
      </HStack>
    </Box>
  );
};

export default TicketDetail;
