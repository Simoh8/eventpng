import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { ExclamationCircleIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import GoogleLoginButton from '../components/GoogleLoginButton';

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

  const handleSubmit = async (values, { setSubmitting, setStatus, setFieldError, resetForm }) => {
    let toastId;
    try {
      setStatus(null); // Clear previous errors
      setSubmitting(true);
      
    
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
            // Map backend field names to form field names if needed
            const formField = field === 'full_name' ? 'name' : 
                            field === 'confirm_password' ? 'confirmPassword' :
                            field;
            setFieldError(formField, errorMsg);
          });
          
          // Show a general error toast if there are non-field errors
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
          // Handle non-validation errors
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
      
      // Show error toast
      toast.error(errorMsg, { 
        duration: 5000,
        position: 'top-center'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Success message component
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
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
            <h2 className="mt-3 text-2xl font-medium text-gray-900">Registration Successful!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Please check your email to verify your account before signing in.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {({ status }) => status?.error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
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
            {({ errors, touched, isSubmitting, values, setFieldValue }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <div className="mt-1 relative">
                    <Field
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      className={`appearance-none block w-full px-3 py-2 border ${errors.name && touched.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="John Doe"
                    />
                    {errors.name && touched.name && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  {errors.name && touched.name && (
                    <p className="mt-2 text-sm text-red-600" id="email-error">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`appearance-none block w-full px-3 py-2 border ${errors.email && touched.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
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
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                    <span className="text-xs font-normal text-gray-500 ml-1">(min 8 chars, with uppercase, lowercase, number & special char)</span>
                  </label>
                  <div className="mt-1 relative">
                    <Field
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`appearance-none block w-full px-3 py-2 border ${errors.password && touched.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10`}
                      aria-describedby="password-requirements"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <div id="password-requirements" className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Password must contain:</p>
                    <ul className="text-xs space-y-0.5">
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
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <div className="mt-1 relative">
                    <Field
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`appearance-none block w-full px-3 py-2 border ${errors.confirmPassword && touched.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex items-center">
                  <Field
                    id="isPhotographer"
                    name="isPhotographer"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPhotographer" className="ml-2 block text-sm text-gray-900">
                    I am a photographer
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading || isSubmitting ? (
                      <>
                        <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                        Creating account...
                      </>
                    ) : (
                      'Create account'
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleLoginButton 
                text="Sign up with Google"
                isSignUp={true}
              />
            </div>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                By creating an account, you agree to our{' '}
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
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
