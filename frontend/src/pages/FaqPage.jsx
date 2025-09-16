import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaChevronUp, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const FaqPage = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  const faqs = [
    {
      question: 'How do I purchase images?',
      answer: 'To purchase images, simply browse through our collection, select the images you like, and add them to your cart. Then proceed to checkout to complete your purchase.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept various payment methods including M-Pesa, credit/debit cards, and mobile money. All transactions are secure and encrypted.'
    },
    {
      question: 'Can I use the images for commercial purposes?',
      answer: 'Yes, all images purchased come with a commercial license that allows you to use them for both personal and commercial projects. However, you may not resell or redistribute the images.'
    },
    {
      question: 'How will I receive my purchased images?',
      answer: 'After completing your purchase, you will receive a download link via email. You can also access your purchased images anytime by logging into your account.'
    },
    {
      question: 'What is your refund policy?',
      answer: 'We offer a 30-day money-back guarantee if you are not satisfied with your purchase. Please contact our support team for assistance with refunds.'
    },
    {
      question: 'Can I request a custom photoshoot?',
      answer: 'Yes, we offer custom photoshoot services. Please contact us with your requirements and we\'ll be happy to discuss your project.'
    },
    {
      question: 'How do I become a photographer on your platform?',
      answer: 'We\'re always looking for talented photographers! Please visit our \'Become a Photographer\' page and submit your portfolio for review.'
    },
    {
      question: 'Do you offer bulk discounts?',
      answer: 'Yes, we offer special pricing for bulk purchases. Contact our sales team for more information on volume discounts.'
    },
    {
      question: 'What resolution are the images?',
      answer: 'All our images are available in high resolution, typically 300 DPI or higher, suitable for both web and print media.'
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can reach our customer support team by email at support@imagegallery.com or by phone at +254 700 000000. We typically respond within 24 hours.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 sm:text-5xl mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about our image gallery and services
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mb-10 max-w-2xl mx-auto"
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </motion.div>

        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left focus:outline-none flex justify-between items-center hover:bg-gray-50 transition-colors duration-200"
                >
                  <h3 className="text-lg font-medium text-gray-900 pr-4">{faq.question}</h3>
                  {openIndex === index ? (
                    <FaChevronUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <FaChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-0 text-gray-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10"
            >
              <div className="text-gray-500 text-lg mb-2">No results found</div>
              <p className="text-gray-400">Try different search terms or browse all questions</p>
            </motion.div>
          )}
        </div>

        {/* Additional Help Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-center text-white shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="mb-6 text-blue-100 max-w-2xl mx-auto">
            Can't find the answer you're looking for? Our support team is here to help you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
          <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/contact')}
          className="px-6 py-3 bg-white text-blue-600 font-medium rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          Contact Support
        </motion.button>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FaqPage;