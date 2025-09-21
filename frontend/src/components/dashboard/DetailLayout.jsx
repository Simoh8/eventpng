import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const DetailLayout = ({ title, children, onBack }) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            type="button"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">{title}</h1>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailLayout;
