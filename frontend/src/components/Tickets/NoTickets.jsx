import React from 'react';
import { Container, Button, Text, Heading, Icon } from '@chakra-ui/react';
import { CalendarIcon } from '@chakra-ui/icons';

const NoTickets = ({ onBrowseEvents }) => {
  return (
    <Container maxW="container.md" py={16} textAlign="center">
      <Icon as={CalendarIcon} boxSize={16} color="gray.400" mb={4} />
      <Heading as="h2" size="lg" mb={4}>No Tickets Found</Heading>
      <Text color="gray.500" mb={6}>You haven't purchased any tickets yet.</Text>
      <Button colorScheme="teal" onClick={onBrowseEvents}>
        Browse Events
      </Button>
    </Container>
  );
};

export default NoTickets;
