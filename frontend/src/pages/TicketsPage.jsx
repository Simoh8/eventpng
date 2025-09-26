import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';
import { FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt, FaInfoCircle } from 'react-icons/fa';

const TicketsPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTickets, setSelectedTickets] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch events with tickets
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events-with-tickets'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}api/gallery/events/with-tickets/`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    // Reset selected tickets when changing events
    setSelectedTickets({});
  };

  const handleTicketQuantityChange = (ticketId, quantity) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: Math.max(0, parseInt(quantity) || 0)
    }));
  };

  const calculateTotal = () => {
    if (!selectedEvent) return 0;
    
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      if (quantity > 0) {
        const ticket = selectedEvent.tickets.find(t => t.id === parseInt(ticketId));
        if (ticket) {
          return total + (ticket.price * quantity);
        }
      }
      return total;
    }, 0);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/tickets' } });
      return;
    }

    // Filter out tickets with 0 quantity
    const ticketsToPurchase = Object.entries(selectedTickets)
      .filter(([_, quantity]) => quantity > 0)
      .map(([ticketId, quantity]) => ({
        ticket_id: parseInt(ticketId),
        quantity
      }));

    if (ticketsToPurchase.length === 0) {
      toast.error('Please select at least one ticket');
      return;
    }

    console.log('Proceeding to checkout with tickets:', ticketsToPurchase);
    toast.success('Proceeding to checkout');
  };

  if (isLoadingEvents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
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
          {/* Events List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Upcoming Events</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {events.length > 0 ? (
                  events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleEventSelect(event)}
                      className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors duration-150 ${selectedEvent?.id === event.id ? 'bg-blue-50' : ''}`}
                    >
                      <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <FaCalendarAlt className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        <span>{format(new Date(event.date), 'MMMM d, yyyy')}</span>
                        {event.end_date && (
                          <span className="mx-1">- {format(new Date(event.end_date), 'MMMM d, yyyy')}</span>
                        )}
                      </div>
                      {event.location && (
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <FaMapMarkerAlt className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-4 text-center text-gray-500">
                    No upcoming events with tickets available.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Selection */}
          <div className="lg:col-span-2">
            {selectedEvent ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    {selectedEvent.name} - Ticket Selection
                  </h2>
                  <div className="mt-1 text-sm text-gray-500">
                    {format(new Date(selectedEvent.date), 'MMMM d, yyyy')}
                    {selectedEvent.location && ` • ${selectedEvent.location}`}
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="px-6 py-4 border-b border-gray-200">
                    <p className="text-gray-700">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="divide-y divide-gray-200">
                  {selectedEvent.tickets && selectedEvent.tickets.length > 0 ? (
                    selectedEvent.tickets.map((ticket) => (
                      <div key={ticket.id} className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <FaTicketAlt className="h-5 w-5 text-blue-600 mr-2" />
                              <h3 className="text-lg font-medium text-gray-900">
                                {ticket.ticket_type.name}
                              </h3>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {ticket.ticket_type.description}
                            </p>
                            <div className="mt-2">
                              <span className="text-2xl font-bold text-gray-900">
                                ${ticket.price.toFixed(2)}
                              </span>
                              {ticket.quantity_available !== null && (
                                <span className="ml-2 text-sm text-gray-500">
                                  ({ticket.remaining_quantity} of {ticket.quantity_available} remaining)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 md:mt-0 flex items-center">
                            <input
                              type="number"
                              min="0"
                              max={ticket.quantity_available || 10}
                              value={selectedTickets[ticket.id] || ''}
                              onChange={(e) => handleTicketQuantityChange(ticket.id, e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0"
                              disabled={ticket.quantity_available === 0}
                            />
                            {ticket.quantity_available === 0 && (
                              <span className="ml-2 text-sm text-red-600">Sold out</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No tickets available for this event.
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-medium text-gray-900">
                      Total: ${calculateTotal().toFixed(2)}
                    </div>
                    <button
                      onClick={handleCheckout}
                      disabled={calculateTotal() === 0}
                      className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${calculateTotal() === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <FaInfoCircle className="flex-shrink-0 mr-1.5 h-4 w-4 text-blue-500" />
                    <span>You'll be able to review your order before payment</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-8 text-center">
                  <FaTicketAlt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No event selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select an event from the list to view available tickets.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
