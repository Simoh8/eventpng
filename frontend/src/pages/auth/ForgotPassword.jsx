import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaEnvelope } from 'react-icons/fa';
import authService from '../../services/authService';

const ForgotPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        setIsSubmitting(true);
        await authService.forgotPassword(values.email);
        setEmailSent(true);
        toast.success('Password reset link sent to your email!');
      } catch (error) {
        // Use the error message from the backend if available, otherwise use a generic message
        const errorMessage = error?.message || error?.detail || 'Failed to send reset email. Please try again.';
        setFieldError('email', errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
        setSubmitting(false);
      }
    },
  });

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <FaEnvelope className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Check Your Email</h2>
              <p className="mt-2 text-gray-600">
                We've sent a password reset link to <span className="font-medium">{formik.values.email}</span>.
                Please check your inbox and follow the instructions to reset your password.
              </p>
              <div className="mt-8">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
                >
                  Back to Login
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Didn't receive an email?{' '}
                <button
                  onClick={() => setEmailSent(false)}
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-300"
                >
                  Try again
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Forgot Password?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={formik.handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`appearance-none block w-full px-4 py-3 border ${
                      formik.touched.email && formik.errors.email ? 'border-red-300' : 'border-gray-300'
                    } rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                    placeholder="your@email.com"
                  />
                </div>
                {formik.touched.email && formik.errors.email && (
                  <p className="mt-2 text-sm text-red-600">{formik.errors.email}</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center transition-colors duration-300"
              >
                <FaArrowLeft className="mr-1" /> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
