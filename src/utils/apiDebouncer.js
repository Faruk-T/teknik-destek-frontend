// API call debouncing utility to prevent excessive requests
const apiCallDebouncer = new Map();
const DEBOUNCE_DELAY = 1000; // 1 saniye

/**
 * Debounces API calls to prevent excessive requests
 * @param {string} key - Unique key for the API call
 * @param {Function} apiFunction - The API function to call
 * @returns {Promise} - Promise that resolves with the API result
 */
export const debouncedApiCall = (key, apiFunction) => {
  if (apiCallDebouncer.has(key)) {
    clearTimeout(apiCallDebouncer.get(key));
  }
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(async () => {
      try {
        const result = await apiFunction();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        apiCallDebouncer.delete(key);
      }
    }, DEBOUNCE_DELAY);
    
    apiCallDebouncer.set(key, timeoutId);
  });
};

/**
 * Clears all pending debounced API calls
 */
export const clearAllDebouncedCalls = () => {
  apiCallDebouncer.forEach(timeoutId => clearTimeout(timeoutId));
  apiCallDebouncer.clear();
};

/**
 * Clears a specific debounced API call
 * @param {string} key - The key of the API call to clear
 */
export const clearDebouncedCall = (key) => {
  if (apiCallDebouncer.has(key)) {
    clearTimeout(apiCallDebouncer.get(key));
    apiCallDebouncer.delete(key);
  }
};

export default debouncedApiCall;
