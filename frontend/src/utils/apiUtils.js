import axios from 'axios';

// Cache for storing request timestamps
const requestTimestamps = [];
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const MAX_RETRIES = 3;

/**
 * Makes an API request with retry and rate limiting
 * @param {Function} requestFn - The axios request function to execute
 * @param {number} retries - Number of retries remaining
 * @returns {Promise} - The API response
 */
export const makeRequest = async (requestFn, retries = MAX_RETRIES) => {
  try {
    // Check rate limiting
    const now = Date.now();
    const recentRequests = requestTimestamps.filter(time => now - time < RATE_LIMIT_DELAY);
    
    // If we've made requests recently, wait before making a new one
    if (recentRequests.length > 0) {
      const timeSinceLastRequest = now - recentRequests[recentRequests.length - 1];
      const delay = Math.max(0, RATE_LIMIT_DELAY - timeSinceLastRequest);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Make the request and record the timestamp
    const response = await requestFn();
    requestTimestamps.push(Date.now());
    return response;
    
  } catch (error) {
    // If we get a 429 and have retries left, wait and retry
    if (error.response?.status === 429 && retries > 0) {
      const retryAfter = error.response.headers['retry-after'] || 1;
      const delay = parseInt(retryAfter, 10) * 1000 || 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeRequest(requestFn, retries - 1);
    }
    
    // If no retries left or different error, rethrow
    throw error;
  }
};

/**
 * Makes multiple API requests with rate limiting between each
 * @param {Array<Function>} requestFns - Array of axios request functions
 * @returns {Promise<Array>} - Array of responses
 */
export const makeRequests = async (requestFns) => {
  const results = [];
  
  for (const requestFn of requestFns) {
    try {
      const response = await makeRequest(requestFn);
      results.push(response);
    } catch (error) {
      results.push({ error });
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};