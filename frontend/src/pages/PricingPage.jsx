import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import PageContainer from '../components/PageContainer';

const pricingPlans = [
  {
    name: 'Pay As You Go',
    price: ' KSH',
    description: 'Per image download',
    features: [
      'High-quality image downloads',
      'No subscription required',
      'Instant access to purchased images',
      'Secure payment processing'
    ],
    cta: 'Start Downloading',
    popular: false
  },
  {
    name: 'Bulk Download',
    price: 'Contact Us',
    description: 'For bulk image purchases',
    features: [
      'Discounted rates for bulk purchases',
      'Custom packages available',
      'Priority support',
      'Dedicated account manager'
    ],
    cta: 'Contact Sales',
    popular: true
  }
];

const ContactForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    country_code: '+254',
    message: '',
    subject: 'User Inquiry'
  });
  const [phone, setPhone] = useState('+254 ');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');

    try {
      if (!formData.name?.trim()) {
        throw new Error('Please enter your name');
      }
      
      if (!formData.email?.trim()) {
        throw new Error('Please enter your email address');
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (!phone?.trim()) {
        throw new Error('Phone number is required');
      }
      
      const phoneNumber = phone.trim();
      const countryCodeMatch = phoneNumber.match(/^\+\d{1,3}/);
      const countryCode = countryCodeMatch ? countryCodeMatch[0] : '+254';
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      
      if (digitsOnly.length < 8) {
        throw new Error('Phone number is too short');
      }
      
      if (digitsOnly.length > 15) {
        throw new Error('Phone number is too long');
      }

      const submissionData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone_number: phoneNumber,
        country_code: countryCode,
        message: formData.message?.trim() || '',
        subject: formData.subject?.trim() || 'Bulk Download Inquiry'
      };
      
      const apiUrl = `${API_BASE_URL}/api/contact/`;
      
      const response = await axios({
        method: 'post',
        url: apiUrl,
        data: submissionData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false,
        validateStatus: (status) => status < 500
      });
      
      if (response.status >= 200 && response.status < 300) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setFormData({ 
            name: '', 
            email: '', 
            phone_number: '',
            country_code: '+254',
            message: '',
            subject: 'User Inquiry'
          });
          setPhone('+254');
        }, 2000);
      } else {
        let errorMessage = 'Failed to send message. Please check your input and try again.';
        
        if (response.data) {
          if (typeof response.data === 'string') {
            errorMessage = response.data;
          } else if (response.data.detail) {
            errorMessage = response.data.detail;
          } else if (response.data.non_field_errors) {
            errorMessage = response.data.non_field_errors.join('\n');
          } else if (typeof response.data === 'object') {
            const fieldErrors = Object.entries(response.data)
              .filter(([_, value]) => value)
              .map(([field, errors]) => {
                if (Array.isArray(errors)) {
                  return `${field}: ${errors.join(', ')}`;
                }
                return `${field}: ${errors}`;
              });
            
            if (fieldErrors.length > 0) {
              errorMessage = fieldErrors.join('\n');
            }
          }
        }
        
        setError(errorMessage);
        setStatus('error');
      }
    } catch (err) {
      let errorMessage = 'Failed to submit the form. ';
      
      if (err.response) {
        if (err.response.status === 400) {
          if (err.response.data) {
            if (typeof err.response.data === 'string') {
              errorMessage += err.response.data;
            } else if (err.response.data.detail) {
              errorMessage += err.response.data.detail;
            } else if (err.response.data.non_field_errors) {
              errorMessage += err.response.data.non_field_errors.join('\n');
            } else {
              const fieldErrors = Object.entries(err.response.data)
                .filter(([_, value]) => value)
                .map(([field, errors]) => {
                  if (Array.isArray(errors)) {
                    return `${field}: ${errors.join(', ')}`;
                  }
                  return `${field}: ${errors}`;
                });
              
              if (fieldErrors.length > 0) {
                errorMessage += fieldErrors.join('\n');
              } else {
                errorMessage += 'Invalid form data';
              }
            }
          } else {
            errorMessage += 'Please check your input and try again.';
          }
        } else if (err.response.status === 500) {
          errorMessage += 'Server error. Please try again later.';
        } else if (err.response.status === 404) {
          errorMessage += 'The requested resource was not found.';
        } else if (err.response.status === 403) {
          errorMessage += 'You do not have permission to perform this action.';
        } else if (err.response.status === 401) {
          errorMessage += 'Please log in to perform this action.';
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your internet connection and try again.';
      } else {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-2xl font-bold text-gray-900 mb-4" id="modal-title">
                Bulk Download Inquiry
              </h3>
              <div className="mt-2">
                {status === 'success' ? (
                  <div className="rounded-xl bg-green-50 p-6 border border-green-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-lg font-medium text-green-800">
                          Thank you for your inquiry!
                        </p>
                        <p className="mt-1 text-green-700">
                          We've received your message and will get back to you soon.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="rounded-xl bg-red-50 p-4 border border-red-200">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-red-800">
                              {error}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        id="subject"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Bulk Download Inquiry"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="mt-1">
                        <PhoneInput
                          international
                          defaultCountry="KE"
                          value={phone}
                          onChange={setPhone}
                          required
                          className="phone-input rounded-xl focus-within:ring-2 focus-within:ring-blue-500"
                          inputClassName="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your download needs..."
                      />
                    </div>
                    <div className="mt-6">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={status === 'sending'}
                        className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 transition duration-200"
                      >
                        {status === 'sending' ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </div>
                        ) : 'Send Message'}
                      </motion.button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PricingPage() {
  const [showContactForm, setShowContactForm] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
      <PageContainer>
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 sm:text-5xl sm:tracking-tight lg:text-6xl mb-4"
          >
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 max-w-xl mx-auto text-xl text-gray-600"
          >
            High-quality images at an affordable price. Pay only for what you need.
          </motion.p>
        </div>

        <div className="mt-16 space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-10 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                plan.popular ? 'ring-2 ring-blue-500 transform hover:-translate-y-1' : 'border border-gray-100'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-bl-xl rounded-tr-xl">
                  MOST POPULAR
                </div>
              )}
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.price !== 'Contact Us' && (
                    <span className="ml-2 text-xl font-medium text-gray-500">/image</span>
                  )}
                </div>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <svg
                        className="flex-shrink-0 h-6 w-6 text-green-500 mt-0.5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => plan.name === 'Bulk Download' ? setShowContactForm(true) : window.location.href = '/events'}
                    className={`w-full py-3 px-6 rounded-xl font-medium shadow-md transition duration-200 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {plan.cta}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 bg-white rounded-2xl shadow-lg p-8 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">How does the pricing work?</h3>
              <p className="mt-2 text-gray-600">
                Each image download costs 10 KSH. You only pay for the images you download, with no hidden fees or subscriptions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">What payment methods do you accept?</h3>
              <p className="mt-2 text-gray-600">
                We accept M-Pesa, credit/debit cards, and other popular payment methods in Kenya.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Can I get a refund?</h3>
              <p className="mt-2 text-gray-600">
                Due to the digital nature of our products, we don't offer refunds for downloaded images. Please preview images carefully before purchasing.
              </p>
            </div>
          </div>
        </motion.div>
      </PageContainer>
      
      <AnimatePresence>
        {showContactForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ContactForm onClose={() => setShowContactForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}