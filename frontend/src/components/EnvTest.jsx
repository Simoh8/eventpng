import React from 'react';

const EnvTest = () => {
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="font-medium text-yellow-800">Environment Variables:</h3>
      <pre className="mt-2 text-sm text-yellow-700 overflow-x-auto">
        {JSON.stringify({
          REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          NODE_ENV: process.env.NODE_ENV,
        }, null, 2)}
      </pre>
    </div>
  );
};

export default EnvTest;
