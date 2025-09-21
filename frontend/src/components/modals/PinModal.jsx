import React, { useState, useEffect } from 'react';

const PinModal = ({ isOpen, onClose, onPinSubmit, isLoading, error }) => {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setLocalError(error || '');
  }, [error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setLocalError('Please enter a PIN');
      return;
    }
    onPinSubmit(pin);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Enter Event PIN</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  This is a private event. Please enter the PIN provided by the event organizer.
                </p>
              </div>
              <div className="mt-4">
                <form onSubmit={handleSubmit}>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter PIN"
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        if (localError) setLocalError('');
                      }}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  {localError && (
                    <p className="mt-2 text-sm text-red-600">{localError}</p>
                  )}
                  <div className="mt-5 sm:mt-6">
                    <button
                      type="submit"
                      className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verifying...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
