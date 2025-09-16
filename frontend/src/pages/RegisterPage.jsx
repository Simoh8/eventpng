import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { ExclamationCircleIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { FaHome } from 'react-icons/fa';

// Validation schema
const registerSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])/,
      'Must contain at least one lowercase letter'
    )
    .matches(
      /^(?=.*[A-Z])/,
      'Must contain at least one uppercase letter'
    )
    .matches(
      /^(?=.*\d)/,
      'Must contain at least one number'
    )
    .matches(
      /^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/,
      'Must contain at least one special character'
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  isPhotographer: Yup.boolean()
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSubmit = async (values, { setSubmitting, setStatus, setFieldError, resetForm }) => {
    let toastId;
    try {
      setStatus(null);
      setSubmitting(true);
      setIsLoading(true);
      
      // Show loading toast
      toastId = toast.loading('Creating your account...');
      
      const { 
        success, 
        error, 
        data, 
        fieldErrors = {}, 
        isValidationError = false 
      } = await register({
        name: values.name,
        email: values.email,
        password: values.password,
        isPhotographer: values.isPhotographer || false
      });
      
      if (success) {
        const message = data?.message || 'Registration successful! Welcome to EventPhoto!';
        setSuccessMessage(message);
        setIsSuccess(true);
        
        // Update toast to success
        toast.success(message, { 
          id: toastId,
          duration: 4000,
          position: 'top-center'
        });
        
        // Reset form
        resetForm();
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        if (isValidationError && fieldErrors) {
          // Set field-specific errors
          Object.entries(fieldErrors).forEach(([field, errorMsg]) => {
            const formField = field === 'full_name' ? 'name' : 
                            field === 'confirm_password' ? 'confirmPassword' :
                            field;
            setFieldError(formField, errorMsg);
          });
          
          if (fieldErrors.non_field_errors) {
            toast.error(fieldErrors.non_field_errors.join(' '), { 
              id: toastId,
              duration: 5000,
              position: 'top-center'
            });
          } else {
            toast.dismiss(toastId);
          }
        } else {
          const errorMsg = error?.message || error || 'Registration failed. Please check your details and try again.';
          setStatus({ error: errorMsg });
          
          toast.error(errorMsg, { 
            id: toastId,
            duration: 5000,
            position: 'top-center'
          });
        }
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setStatus({ error: errorMsg });
      
      toast.error(errorMsg, { 
        duration: 5000,
        position: 'top-center'
      });
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };

  // Success message component
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-2xl shadow-xl border border-indigo-100">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg
                className="h-10 w-10 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Registration Successful!</h2>
            <p className="mt-4 text-lg text-gray-600">
              {successMessage}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Please check your email to verify your account before signing in.
            </p>
            <div className="mt-8">
              <Link
                to="/login"
                className="w-full flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">      {/* Home Button */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 bg-white text-indigo-600 hover:text-indigo-700 font-medium py-3 px-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-indigo-200 hover:border-indigo-400 hover:scale-105"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <FaHome className={`w-5 h-5 transition-all duration-300 ${isHovered ? 'animate-bounce' : ''}`} />
        <span className="transition-all duration-300">{isHovered ? 'Return Home' : 'Back to Home'}</span>
        
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 transition-all duration-1000 ${
            isHovered ? 'translate-x-full' : '-translate-x-full'
          }`} />
        </div>
      </Link>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Create your account
        </h2>
        <p className="mt-4 text-center text-lg text-gray-600">
          Join our community of event enthusiasts and photographers
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-300">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl sm:rounded-2xl sm:px-10 border border-indigo-100">
          <Formik
            initialValues={{
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
              isPhotographer: false,
            }}
            validationSchema={registerSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting, values, setFieldValue, status }) => (
              <>
                {status?.error && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{status.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full name
                    </label>
                    <div className="relative">
                      <Field
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        className={`appearance-none block w-full px-4 py-3 ${errors.name && touched.name ? 'border-red-300' : 'border-gray-300'} border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300`}
                        placeholder="John Doe"
                      />
                      {errors.name && touched.name && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    {errors.name && touched.name && (
                      <p className="mt-2 text-sm text-red-600" id="name-error">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Field
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className={`appearance-none block w-full px-4 py-3 ${errors.email && touched.email ? 'border-red-300' : 'border-gray-300'} border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300`}
                        placeholder="you@example.com"
                      />
                      {errors.email && touched.email && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    {errors.email && touched.email && (
                      <p className="mt-2 text-sm text-red-600" id="email-error">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                      <span className="text-xs font-normal text-gray-500 ml-1">(min 8 chars, with uppercase, lowercase, number & special char)</span>
                    </label>
                    <div className="relative">
                      <Field
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`appearance-none block w-full px-4 py-3 ${errors.password && touched.password ? 'border-red-300' : 'border-gray-300'} border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 pr-12`}
                        aria-describedby="password-requirements"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                        )}
                      </button>
                    </div>
                    <div id="password-requirements" className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                      <ul className="text-xs space-y-1.5">
                        <li className={`flex items-center ${errors.password && !/^(?=.*[a-z])/.test(values.password) ? 'text-red-600' : 'text-gray-500'}`}>
                          {errors.password && !/^(?=.*[a-z])/.test(values.password) ? (
                            <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          ) : (
                            <svg className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          At least one lowercase letter
                        </li>
                        <li className={`flex items-center ${errors.password && !/^(?=.*[A-Z])/.test(values.password) ? 'text-red-600' : 'text-gray-500'}`}>
                          {errors.password && !/^(?=.*[A-Z])/.test(values.password) ? (
                            <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          ) : (
                            <svg className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          At least one uppercase letter
                        </li>
                        <li className={`flex items-center ${errors.password && !/^(?=.*\d)/.test(values.password) ? 'text-red-600' : 'text-gray-500'}`}>
                          {errors.password && !/^(?=.*\d)/.test(values.password) ? (
                            <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          ) : (
                            <svg className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          At least one number
                        </li>
                        <li className={`flex items-center ${errors.password && !/^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/.test(values.password) ? 'text-red-600' : 'text-gray-500'}`}>
                          {errors.password && !/^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/.test(values.password) ? (
                            <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          ) : (
                            <svg className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          At least one special character
                        </li>
                        <li className={`flex items-center ${errors.password && values.password.length < 8 ? 'text-red-600' : 'text-gray-500'}`}>
                          {errors.password && values.password.length < 8 ? (
                            <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                          ) : (
                            <svg className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          At least 8 characters long
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Field
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className={`appearance-none block w-full px-4 py-3 ${errors.confirmPassword && touched.confirmPassword ? 'border-red-300' : 'border-gray-300'} border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 pr-12`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && touched.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
                    <Field
                      id="isPhotographer"
                      name="isPhotographer"
                      type="checkbox"
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPhotographer" className="ml-3 block text-sm font-medium text-gray-700">
                      I am a photographer
                    </label>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      {isLoading || isSubmitting ? (
                        <>
                          <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                          Creating account...
                        </>
                      ) : (
                        'Create account'
                      )}
                    </button>
                  </div>
                </Form>
              </>
            )}
          </Formik>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleLoginButton 
                text="Sign up with Google"
                isSignUp={true}
              />
            </div>

            <div className="mt-8 text-center text-sm">
              <p className="text-gray-600">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-300">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}