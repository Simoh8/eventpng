import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import PageContainer from '../components/PageContainer';

const pricingPlans = [
  {
    name: 'Pay As You Go',
    price: '10 KSH',
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
    country_code: '+254', // Default to Kenya's country code
    message: '',
    subject: 'User Inquiry' // Default subject
  });
  const [phone, setPhone] = useState('+254 '); // Initialize with default country code and space
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
      // Basic validation
      if (!formData.name?.trim()) {
        throw new Error('Please enter your name');
      }
      
      if (!formData.email?.trim()) {
        throw new Error('Please enter your email address');
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Phone validation
      if (!phone?.trim()) {
        throw new Error('Phone number is required');
      }
      
      const phoneNumber = phone.trim();
      
      // Extract country code (first 1-4 digits after +)
      const countryCodeMatch = phoneNumber.match(/^\+\d{1,3}/);
      const countryCode = countryCodeMatch ? countryCodeMatch[0] : '+254';
      
      // Get digits only for validation
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      
      // Validate the number length
      if (digitsOnly.length < 8) { // Minimum 8 digits
        throw new Error('Phone number is too short');
      }
      
      if (digitsOnly.length > 15) { // Maximum 15 digits
        throw new Error('Phone number is too long');
      }

      // Prepare the data to send
      const submissionData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone_number: phoneNumber, // Send full number including country code
        country_code: countryCode, // Still include country code separately
        message: formData.message?.trim() || '',
        subject: formData.subject?.trim() || 'Bulk Download Inquiry'
      };
      
      // Log the formatted phone number for debugging
      console.log('Form data prepared:', {
        ...submissionData,
        full_phone: phoneNumber // For logging only
      });
      
      // Use the API endpoint from config
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/contact/`;
      
      console.log('Sending POST request to:', apiUrl);
      
      // Send the request without authentication
      const response = await axios({
        method: 'post',
        url: apiUrl,
        data: submissionData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: false, // No need for credentials
        validateStatus: (status) => status < 500 // Don't throw for 4xx errors
      });
      
      console.log('Response received:', response);

      if (response.status >= 200 && response.status < 300) {
        setStatus('success');
        // Reset form after successful submission
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setFormData({ 
            name: '', 
            email: '', 
            phone_number: '',
            country_code: '+254',
            message: '',
            subject: ' User Inquiry'
          });
          setPhone('+254'); // Reset to default country code
        }, 2000);
      } else {
        // Handle API validation errors
        let errorMessage = 'Failed to send message. Please check your input and try again.';
        
        if (response.data) {
          console.error('API Error:', response.data);
          
          // Handle different error response formats
          if (typeof response.data === 'string') {
            errorMessage = response.data;
          } else if (response.data.detail) {
            errorMessage = response.data.detail;
          } else if (response.data.non_field_errors) {
            errorMessage = response.data.non_field_errors.join('\n');
          } else if (typeof response.data === 'object') {
            // Handle field-specific errors
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
        } else {
          console.error('No response data received');
        }
        
        setError(errorMessage);
        setStatus('error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      let errorMessage = 'Failed to submit the form. ';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
        
        if (err.response.status === 400) {
          // Handle validation errors
          if (err.response.data) {
            if (typeof err.response.data === 'string') {
              errorMessage += err.response.data;
            } else if (err.response.data.detail) {
              errorMessage += err.response.data.detail;
            } else if (err.response.data.non_field_errors) {
              errorMessage += err.response.data.non_field_errors.join('\n');
            } else {
              // Handle field-specific errors
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
        // The request was made but no response was received
        console.error('No response received:', err.request);
        errorMessage = 'No response from server. Please check your internet connection and try again.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', err.message);
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
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Bulk Download Inquiry
              </h3>
              <div className="mt-2">
                {status === 'success' ? (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                          Thank you! We've received your inquiry and will get back to you soon.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={formData.name}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        id="subject"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="User Inquiry"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <div className="mt-1">
                        <PhoneInput
                          international
                          defaultCountry="KE"
                          value={phone}
                          onChange={(value) => {
                            setPhone(value || '+254'); // Ensure we always have a value
                          }}
                          required
                          className="phone-input"
                          inputClassName="block w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          error={phone ? undefined : 'Phone number is required'}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Your Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your download needs..."
                      />
                    </div>
                    <div className="mt-5 sm:mt-6">
                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          status === 'sending' ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                      >
                        {status === 'sending' ? 'Sending...' : 'Send Message'}
                      </button>
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
    <div className="min-h-screen bg-gray-50 py-12">
      <PageContainer>
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            High-quality images at an affordable price. Pay only for what you need.
          </p>
        </div>

        <div className="mt-16 space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-10 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-white border-2 rounded-2xl shadow-sm overflow-hidden ${
                plan.popular ? 'border-primary-500' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}
              <div className="p-8">
                <h2 className="text-lg font-medium text-gray-900">{plan.name}</h2>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.price !== 'Contact Us' && (
                    <span className="ml-1 text-xl font-medium text-gray-500">/image</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-primary-500"
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
                      <span className="ml-3 text-base text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => plan.name === 'Bulk Download' ? setShowContactForm(true) : window.location.href = '/events'}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      plan.popular
                        ? 'bg-primary-600 hover:bg-primary-700'
                        : 'bg-gray-800 hover:bg-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-2xl shadow-sm p-8 max-w-3xl mx-auto">
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
        </div>
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
