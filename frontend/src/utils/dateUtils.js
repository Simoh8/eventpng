/**
 * Format a date string to a readable format
 * @param {string} dateString - Date string in ISO format
 * @param {Object} options - Options for date formatting
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'Date not specified';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format a date range from start and end dates
 * @param {string} startDate - Start date string in ISO format
 * @param {string} endDate - End date string in ISO format
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate) return 'Date not specified';
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  if (!end || start.toDateString() === end.toDateString()) {
    return formatDate(startDate);
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate, { timeZoneName: 'short' })}` ;
};

/**
 * Check if a date is in the past
 * @param {string} dateString - Date string in ISO format
 * @returns {boolean} True if the date is in the past
 */
export const isPastDate = (dateString) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

/**
 * Get the time remaining until a date
 * @param {string} dateString - Future date string in ISO format
 * @returns {Object} Object with days, hours, minutes, and seconds remaining
 */
export const getTimeRemaining = (dateString) => {
  if (!dateString) return null;
  
  const now = new Date();
  const target = new Date(dateString);
  const diff = target - now;
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'USD')
 * @param {Object} options - Additional options for number formatting
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', options = {}) => {
  if (typeof amount !== 'number') {
    console.warn('formatCurrency: Expected a number for amount, got', amount);
    return '';
  }
  
  const defaultOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  };

  try {
    return new Intl.NumberFormat('en-US', defaultOptions).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return amount.toString();
  }
};