import React from 'react';
import { Card, CardBody, Grid } from '@chakra-ui/react';
import TicketImage from './TicketImage';
import TicketDetails from './TicketDetails';
import TicketStatusPanel from './TicketStatusPanel';

const TicketCard = ({ ticket, borderColor, bgColor, sidePanelBg, secondaryText, onViewDetails }) => {
  return (
    <Card variant="outline" borderColor={borderColor} overflow="hidden" bg={bgColor}>
      <CardBody p={0}>
        <Grid templateColumns={{ base: '1fr', md: '1fr 2fr 1fr' }} gap={6}>
          <TicketImage 
            imageUrl={ticket.event?.image} 
            alt={ticket.event?.name || 'Event'} 
          />
          
          <TicketDetails 
            ticket={ticket} 
            secondaryText={secondaryText}
            onViewDetails={onViewDetails}
          />
          
          <TicketStatusPanel 
            ticket={ticket}
            borderColor={borderColor}
            sidePanelBg={sidePanelBg}
            secondaryText={secondaryText}
          />
        </Grid>
      </CardBody>
    </Card>
  );
};

export default TicketCard;
