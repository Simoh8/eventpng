import React from 'react';
import { Box, Text, HStack, VStack, Divider } from '@chakra-ui/react';
import { FaCheckCircle } from 'react-icons/fa';

export const CheckoutHeader = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Cart' },
    { id: 2, label: 'Information' },
    { id: 3, label: 'Payment' },
    { id: 4, label: 'Confirmation' },
  ];

  return (
    <VStack spacing={4} mb={8} w="full">
      <Text fontSize="2xl" fontWeight="bold">Checkout</Text>
      
      <HStack spacing={0} w="full" justify="space-between" position="relative">
        <Box 
          position="absolute" 
          top="50%" 
          left={0} 
          right={0} 
          height="2px" 
          bg="gray.200" 
          zIndex={1}
        />
        
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.id}>
              <VStack spacing={1} position="relative" zIndex={2}>
                <Box
                  w="8"
                  h="8"
                  rounded="full"
                  bg={isCompleted || isActive ? 'blue.500' : 'gray.200'}
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={isActive ? '2px' : 'none'}
                  borderColor="white"
                  boxShadow={isActive ? '0 0 0 2px #3182ce' : 'none'}
                >
                  {isCompleted ? (
                    <FaCheckCircle size={16} />
                  ) : (
                    <Text fontSize="sm" fontWeight="bold">{step.id}</Text>
                  )}
                </Box>
                <Text 
                  fontSize="xs" 
                  fontWeight={isActive ? 'bold' : 'normal'}
                  color={isActive ? 'blue.600' : 'gray.600'}
                >
                  {step.label}
                </Text>
              </VStack>
              
              {!isLast && (
                <Box 
                  flex={1} 
                  h="2px" 
                  bg={isCompleted ? 'blue.500' : 'gray.200'}
                  position="relative"
                  top="-8px"
                />
              )}
            </React.Fragment>
          );
        })}
      </HStack>
      
      <Divider mt={4} />
    </VStack>
  );
};
