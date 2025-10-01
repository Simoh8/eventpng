import React from 'react';
import { Box, Image, Icon } from '@chakra-ui/react';
import { CalendarIcon } from '@chakra-ui/icons';

const TicketImage = ({ imageUrl, alt = 'Event' }) => {
  return (
    <Box 
      bg="gray.100" 
      minH={{ base: '200px', md: 'auto' }}
      display="flex" 
      alignItems="center" 
      justifyContent="center"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          objectFit="cover"
          w="100%"
          h="100%"
        />
      ) : (
        <Icon as={CalendarIcon} boxSize={12} color="gray.400" />
      )}
    </Box>
  );
};

export default TicketImage;
