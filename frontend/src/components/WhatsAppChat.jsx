import React, { useState } from 'react';

const WhatsAppChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);

  const numbers = [
    { name: 'Support', number: '254742582849' },
    { name: 'Sales', number: '254745687437' }
  ];

  const openWhatsApp = (number) => {
    window.open(`https://wa.me/${number}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-64 bg-white rounded-lg shadow-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Chat with us</h3>
          {numbers.map((item) => (
            <button
              key={item.number}
              onClick={() => openWhatsApp(item.number)}
              className="w-full flex items-center p-2 text-left rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="bg-green-500 p-2 rounded-full mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.498 14.382v-.002c-.3-.3-.7-.4-1.1-.3l-1.5.4c-.1 0-.3-.1-.4-.2l-1.3-1.3c-1.8-1.8-2.1-4.6-.6-6.7.1-.2.1-.4 0-.5l-1.1-1.1c-.3-.3-.8-.3-1.1 0l-4.3 4.3c-.1.1-.1.3 0 .5 2.2 3.2 5.9 5.1 9.8 5.1.1 0 .3 0 .4 0 .1 0 .3.1.4.2l.4 1.5c.1.4.5.7.9.7.1 0 .2 0 .3-.1l2.5-1.5c.2-.1.3-.3.3-.5 0-.1 0-.3-.1-.4l-4.1-4.1z"/>
                  <path d="M12 2C6.5 2 2 6.5 2 12c0 2.2.7 4.2 1.8 5.9l-1.1 3.3 3.4-1.1c1.6 1.1 3.6 1.7 5.7 1.7 6.1 0 11-4.9 11-11S18.1 2 12 2zm6.3 15.3l-1.1-3.3c0-.1 0-.3.1-.4.1-.1.3-.2.4-.2l2.5-.8c.2-.1.3-.1.4 0 .1.1.1.3.1.4-.7 2.3-2.5 4.1-4.8 4.8-.1 0-.3 0-.4.1-.1.1-.1.3 0 .4l.8 2.5c.1.1.2.2.4.2.1 0 .3 0 .4-.1 1.7-1.1 3.1-2.7 3.9-4.6.1-.1.1-.3 0-.4l-.8-2.5z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">+{item.number}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
        aria-label="WhatsApp Chat"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.498 14.382v-.002c-.3-.3-.7-.4-1.1-.3l-1.5.4c-.1 0-.3-.1-.4-.2l-1.3-1.3c-1.8-1.8-2.1-4.6-.6-6.7.1-.2.1-.4 0-.5l-1.1-1.1c-.3-.3-.8-.3-1.1 0l-4.3 4.3c-.1.1-.1.3 0 .5 2.2 3.2 5.9 5.1 9.8 5.1.1 0 .3 0 .4 0 .1 0 .3.1.4.2l.4 1.5c.1.4.5.7.9.7.1 0 .2 0 .3-.1l2.5-1.5c.2-.1.3-.3.3-.5 0-.1 0-.3-.1-.4l-4.1-4.1z"/>
          <path d="M12 2C6.5 2 2 6.5 2 12c0 2.2.7 4.2 1.8 5.9l-1.1 3.3 3.4-1.1c1.6 1.1 3.6 1.7 5.7 1.7 6.1 0 11-4.9 11-11S18.1 2 12 2zm6.3 15.3l-1.1-3.3c0-.1 0-.3.1-.4.1-.1.3-.2.4-.2l2.5-.8c.2-.1.3-.1.4 0 .1.1.1.3.1.4-.7 2.3-2.5 4.1-4.8 4.8-.1 0-.3 0-.4.1-.1.1-.1.3 0 .4l.8 2.5c.1.1.2.2.4.2.1 0 .3 0 .4-.1 1.7-1.1 3.1-2.7 3.9-4.6.1-.1.1-.3 0-.4l-.8-2.5z"/>
        </svg>
      </button>
    </div>
  );
};

export default WhatsAppChat;
