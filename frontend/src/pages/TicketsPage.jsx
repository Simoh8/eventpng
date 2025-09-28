import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { API_BASE_URL } from '../config';
import { FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt, FaInfoCircle, FaPlus, FaMinus, FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Component to display a collapsible event section
const EventSection = ({ event, tickets, selectedTickets, onSelectTicket, onDeselectTicket }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Group tickets by type
  const ticketsByType = tickets.reduce((groups, ticket) => {
    const type = ticket.ticket_type_name || 'General Admission';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(ticket);
    return groups;
  }, {});

  return (
    <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{event.name}</h3>
          <div className="flex items-center mt-1 text-sm text-gray-600">
            <FaCalendarAlt className="mr-1" />
            <span className="mr-4">{format(parseISO(event.date), 'MMMM d, yyyy')}</span>
            <FaMapMarkerAlt className="mr-1" />
            <span>{event.location}</span>
          </div>
        </div>
        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
      </div>
      
      {isExpanded && (
        <div className="p-4">
          {Object.entries(ticketsByType).map(([type, typeTickets]) => (
            <div key={type} className="mb-6">
              <h4 className="text-lg font-medium text-gray-800 mb-3">{type} Tickets</h4>
              <div className="space-y-4">
                {typeTickets.map(ticket => (
                  <div key={ticket.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg hover:bg-gray-50">
                    <div className="mb-3 sm:mb-0 sm:mr-4">
                      <h5 className="font-medium text-gray-900">{ticket.ticket_type_name || 'General Admission'}</h5>
                      <p className="text-sm text-gray-600">{ticket.ticket_type_description || 'Standard event ticket'}</p>
                      <div className="mt-1 text-sm text-gray-500">
                        {ticket.remaining_quantity !== null ? (
                          <span>{ticket.remaining_quantity} of {ticket.quantity_available} remaining</span>
                        ) : (
                          <span>Unlimited tickets available</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="text-xl font-bold text-primary-600">
                        ${Number(ticket.price).toFixed(2)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeselectTicket(ticket.id);
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                          disabled={!selectedTickets[ticket.id]}
                        >
                          <FaMinus />
                        </button>
                        <span className="w-8 text-center">
                          {selectedTickets[ticket.id] || 0}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(ticket);
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                          disabled={ticket.remaining_quantity !== null && (selectedTickets[ticket.id] || 0) >= ticket.remaining_quantity}
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TicketsPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // State for selected tickets with localStorage persistence
  const [selectedTickets, setSelectedTickets] = useState(() => {
    // Load cart from localStorage on initial render
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('eventTicketsCart');
      return savedCart ? JSON.parse(savedCart) : {};
    }
    return {};
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eventTicketsCart', JSON.stringify(selectedTickets));
    }
  }, [selectedTickets]);

  // Helper function to update selected tickets and persist to localStorage
  const updateSelectedTickets = (updater) => {
    setSelectedTickets(prev => {
      const newTickets = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') {
        localStorage.setItem('eventTicketsCart', JSON.stringify(newTickets));
      }
      return newTickets;
    });
  };

  // Fetch available tickets
  const { data: ticketsData = { results: [] }, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['available-tickets'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}api/gallery/tickets/available/`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error response:', errorData);
          throw new Error(errorData.detail || 'Failed to fetch available tickets');
        }
        const data = await response.json();
        return data;
      } catch (error) {
        throw error;
      }
    },
    onError: (error) => {
      console.error('Query error:', error);
      toast.error(error.message);
    }
  });
  
  const tickets = ticketsData.results || [];
  
  // Group tickets by event
  const ticketsByEvent = tickets.reduce((groups, ticket) => {
    const eventKey = ticket.event_id || 'general';
    if (!groups[eventKey]) {
      groups[eventKey] = {
        id: ticket.event_id,
        name: ticket.event_name,
        date: ticket.event_date,
        location: ticket.event_location,
        tickets: []
      };
    }
    groups[eventKey].tickets.push(ticket);
    return groups;
  }, {});

  const handleTicketSelect = (ticket) => {
    updateSelectedTickets(prev => ({
      ...prev,
      [ticket.id]: (prev[ticket.id] || 0) + 1
    }));
  };
  
  const handleTicketDeselect = (ticketId) => {
    updateSelectedTickets(prev => {
      const newTickets = { ...prev };
      if (newTickets[ticketId] > 0) {
        newTickets[ticketId]--;
        if (newTickets[ticketId] === 0) {
          delete newTickets[ticketId];
        }
      }
      return newTickets;
    });
  };

  const clearCart = () => {
    updateSelectedTickets({});
  };

  const calculateTotal = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      if (quantity > 0) {
        // Flatten all tickets from all events to find the ticket
        const allTickets = Object.values(ticketsByEvent).flatMap(event => event.tickets);
        const ticket = allTickets.find(t => t.id === parseInt(ticketId));
        if (ticket) {
          return total + (Number(ticket.price) * quantity);
        }
      }
      return total;
    }, 0);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Save the current URL to redirect back after login
      const returnTo = window.location.pathname + window.location.search;
      navigate('/login', { state: { from: returnTo } });
      return;
    }

    if (Object.keys(selectedTickets).length === 0) {
      toast.error('Please select at least one ticket');
      return;
    }

    // Process each selected ticket
    const ticketsToPurchase = Object.entries(selectedTickets)
      .filter(([_, quantity]) => quantity > 0)
      .map(([ticketId, quantity]) => {
        const ticketIdNum = parseInt(ticketId);
        
        // Find the ticket in all events
        let ticket = null;
        let eventId = null;
        
        // First, try to find the ticket in ticketsByEvent
        for (const event of Object.values(ticketsByEvent)) {
          const foundTicket = event.tickets.find(t => t.id === ticketIdNum);
          if (foundTicket) {
            ticket = foundTicket;
            // Use event_id from ticket if available, otherwise use event.id
            eventId = ticket.event_id || event.id;
            break;
          }
        }
        
        if (!ticket) {
          console.error('Ticket not found:', ticketId);
          toast.error(`Error: Could not find ticket ${ticketId}`);
          return null;
        }
        
        if (!eventId) {
          console.error('Could not determine event for ticket:', ticket);
          toast.error(`Error: Could not determine event for ticket ${ticketId}`);
          return null;
        }
        
        return {
          event_id: eventId,
          id: ticketIdNum,
          quantity,
          price: parseFloat(ticket.price) || 0,
          name: ticket.ticket_type_name || `Ticket ${ticketId}`,
          ticket_type_id: ticket.id
        };
      })
      .filter(ticket => ticket !== null); // Filter out any null tickets

    if (ticketsToPurchase.length === 0) {
      toast.error('Please select at least one ticket');
      return;
    }
    
    navigate('/checkout', { 
      state: { 
        selectedTickets: ticketsToPurchase,
        total: calculateTotal(),
        fromCart: true
      } 
    });
  };

  if (isLoadingTickets) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        <span className="ml-4">Loading available tickets...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Event Tickets
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Browse and purchase tickets for upcoming events
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Your Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden sticky top-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Your Selection</h2>
              </div>
              <div className="p-4">
                {Object.keys(selectedTickets).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(selectedTickets).map(([ticketId, quantity]) => {
                      // Flatten all tickets to find the selected one
                      const allTickets = Object.values(ticketsByEvent).flatMap(event => event.tickets);
                      const ticket = allTickets.find(t => t.id === parseInt(ticketId));
                      if (!ticket) return null;
                      
                      return (
                        <div key={ticketId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h3 className="font-medium">{ticket.event_name}</h3>
                            <p className="text-sm text-gray-600">{ticket.ticket_type_name}</p>
                            <p className="text-sm font-medium">${Number(ticket.price).toFixed(2)} × {quantity}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTicketDeselect(ticket.id);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <FaMinus />
                            </button>
                            <span>{quantity}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTicketSelect(ticket);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              disabled={ticket.remaining_quantity !== null && quantity >= ticket.remaining_quantity}
                            >
                              <FaPlus />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                      <FaTicketAlt className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets selected</h3>
                    <p className="mt-1 text-sm text-gray-500">Select tickets from the list to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Available Tickets */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {Object.keys(ticketsByEvent).length > 0 ? (
                Object.values(ticketsByEvent).map(event => (
                  <EventSection
                    key={event.id}
                    event={event}
                    tickets={event.tickets}
                    selectedTickets={selectedTickets}
                    onSelectTicket={handleTicketSelect}
                    onDeselectTicket={handleTicketDeselect}
                  />
                ))
              ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                      <FaTicketAlt className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No events with tickets available</h3>
                    <p className="mt-1 text-sm text-gray-500">Check back later for upcoming events.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;