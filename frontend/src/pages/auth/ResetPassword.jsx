import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { Link } from "react-router-dom";

import { FaCheckCircle, FaLock, FaArrowLeft } from 'react-icons/fa';
import authService from '../../services/authService';

const ResetPassword = () => {
  const { uid, token } = useParams();
  const [isValidLink, setIsValidLink] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  // Validate the reset link
  useEffect(() => {
    const validateLink = async () => {
      try {
        // This is a placeholder - in a real app, you might want to validate the token with your backend
        setIsLoading(false);
      } catch (error) {
        console.error('Link validation error:', error);
        setIsValidLink(false);
        setIsLoading(false);
      }
    };

    validateLink();
  }, [uid, token]);

  const validationSchema = Yup.object({
    newPassword: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).*$/,
        'Must contain uppercase, lowercase, number, and special character'
      )
      .required('New password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
      .required('Please confirm your password'),
  });

  const formik = useFormik({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        await authService.resetPassword(uid, token, values.newPassword);
        setIsSuccess(true);
        toast.success('Password has been reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        console.error('Password reset error:', error);
        const errorMessage = error?.detail || 'Failed to reset password. Please try again.';
        setFieldError('newPassword', errorMessage);
        toast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isValidLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h2>
            <p className="text-gray-600 mb-6">
              The password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <FaCheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </p>
            <div className="animate-pulse">
              <div className="h-2 bg-blue-100 rounded-full w-3/4 mx-auto mb-2"></div>
              <div className="h-2 bg-blue-100 rounded-full w-1/2 mx-auto"></div>
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
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <FaLock className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Password</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter your new password below.
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={formik.handleSubmit}>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formik.values.newPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`appearance-none block w-full px-4 py-3 border ${
                      formik.touched.newPassword && formik.errors.newPassword ? 'border-red-300' : 'border-gray-300'
                    } rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                    placeholder="Enter new password"
                  />
                </div>
                {formik.touched.newPassword && formik.errors.newPassword && (
                  <p className="mt-2 text-sm text-red-600">{formik.errors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`appearance-none block w-full px-4 py-3 border ${
                      formik.touched.confirmPassword && formik.errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    } rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300`}
                    placeholder="Confirm new password"
                  />
                </div>
                {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{formik.errors.confirmPassword}</p>
                )}
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  {formik.isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Reset Password'
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

export default ResetPassword;
