import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const FaqPage = () => {
  const [openIndex, setOpenIndex] = useState(null);

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600">
            Find answers to common questions about our image gallery and services
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-4 text-left focus:outline-none flex justify-between items-center"
              >
                <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                {openIndex === index ? (
                  <FaChevronUp className="h-5 w-5 text-primary-500" />
                ) : (
                  <FaChevronDown className="h-5 w-5 text-gray-400" />
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
                    <div className="px-6 pb-4 pt-0 text-gray-600">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-primary-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still have questions?</h2>
          <p className="text-gray-600 mb-6">
            Can't find the answer you're looking for? Our team is happy to help!
          </p>
          <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
