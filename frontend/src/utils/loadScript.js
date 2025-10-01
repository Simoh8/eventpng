/**
 * Utility function to asynchronously load a script
 * @param {string} src - The source URL of the script to load
 * @returns {Promise} A promise that resolves when the script is loaded
 */
export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = (error) => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    
    document.head.appendChild(script);
  });
};

export default loadScript;
