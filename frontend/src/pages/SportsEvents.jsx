import React, { useState } from 'react';
import EventCard from '../components/EventCard';

// Import images
import footballImage from '../assets/images/sports-events/football.jpg';
import basketballImage from '../assets/images/sports-events/basketball.jpg';
import marathonImage from '../assets/images/sports-events/marathon.jpg';
import tennisImage from '../assets/images/sports-events/tennis.jpg';
import swimmingImage from '../assets/images/sports-events/swimming.jpg';
import cyclingImage from '../assets/images/sports-events/cycling.jpg';

// Sample data - in a real app, this would come from an API
const sampleEvents = [
  {
    id: 1,
    title: 'Summer Football League',
    category: 'Football',
    location: 'City Stadium',
    date: '2025-09-15T18:00:00',
    imageUrl: footballImage,
    description: 'Join us for the opening match of the summer football league featuring top local teams.'
  },
  {
    id: 2,
    title: 'Basketball Tournament',
    category: 'Basketball',
    location: 'Downtown Arena',
    date: '2025-09-20T16:30:00',
    imageUrl: basketballImage,
    description: 'Annual city basketball tournament with teams from all over the region.'
  },
  {
    id: 3,
    title: 'Marathon 2025',
    category: 'Running',
    location: 'Central Park',
    date: '2025-10-05T07:00:00',
    imageUrl: marathonImage,
    description: 'Annual city marathon with different race categories for all skill levels.'
  },
  {
    id: 4,
    title: 'Tennis Open',
    category: 'Tennis',
    location: 'City Tennis Club',
    date: '2025-09-25T10:00:00',
    imageUrl: tennisImage,
    description: 'Open tennis tournament for amateur and semi-pro players.'
  },
  {
    id: 5,
    title: 'Swimming Championship',
    category: 'Swimming',
    location: 'Aqua Center',
    date: '2025-10-10T09:00:00',
    imageUrl: swimmingImage,
    description: 'Regional swimming championship featuring top swimmers from the area.'
  },
  {
    id: 6,
    title: 'Cycling Race',
    category: 'Cycling',
    location: 'Mountain Pass Circuit',
    date: '2025-10-15T08:00:00',
    imageUrl: cyclingImage,
    description: 'Challenging mountain pass race for professional and amateur cyclists.'
  }
];

const SportsEvents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(sampleEvents.map(event => event.category))];

  const filteredEvents = sampleEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Upcoming Sports Events</h1>
        <p className="text-xl text-gray-600">Find and register for upcoming sports events in your area</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search events..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-700">No events found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default SportsEvents;
