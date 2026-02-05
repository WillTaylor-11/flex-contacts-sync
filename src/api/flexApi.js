const axios = require('axios');
const logger = require('../utils/logger');

// Configuration
const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

if (!API_KEY || !BASE_URL) {
  throw new Error('FLEX_API_KEY and FLEX_BASE_URL must be set in .env file');
}

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Auth-Token': API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 seconds
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    logger.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error(`API Request Error: ${error.message}`);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    logger.debug(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      if (status === 401) {
        logger.error('Authentication failed: Invalid API key');
      } else if (status === 404) {
        logger.error(`Resource not found: ${error.config.url}`);
      } else if (status === 429) {
        logger.warn('Rate limit exceeded - implement retry logic');
      } else {
        logger.error(`API Error ${status}: ${message}`);
      }
    } else if (error.request) {
      // Request made but no response
      logger.error(`No response from API: ${error.message}`);
    } else {
      // Request setup error
      logger.error(`API Request Setup Error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication errors
      if (error.response?.status === 401) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Get all contacts
 * @param {object} params - Query parameters
 * @returns {Promise<Array>} Array of contacts
 */
async function getContacts(params = {}) {
  return retryWithBackoff(async () => {
    const response = await api.get('/contact', { params });
    logger.info(`Fetched ${response.data.length || 0} contacts`);
    return response.data;
  });
}

/**
 * Search contacts
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching contacts
 */
async function searchContacts(query) {
  return retryWithBackoff(async () => {
    const response = await api.get('/contact/search', {
      params: { q: query }
    });
    logger.info(`Search found ${response.data.length || 0} contacts for query: ${query}`);
    return response.data;
  });
}

/**
 * Get a single contact by ID
 * @param {string} contactId - Contact ID
 * @returns {Promise<object>} Contact data
 */
async function getContactById(contactId) {
  return retryWithBackoff(async () => {
    const response = await api.get(`/contact/${contactId}`);
    logger.debug(`Fetched contact: ${contactId}`);
    return response.data;
  });
}

/**
 * Test API connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    await api.get('/contact', { params: { limit: 1 } });
    logger.info('API connection test successful');
    return true;
  } catch (error) {
    logger.error('API connection test failed');
    return false;
  }
}

module.exports = {
  getContacts,
  searchContacts,
  getContactById,
  testConnection
};
