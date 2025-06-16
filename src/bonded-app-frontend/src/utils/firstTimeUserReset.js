/**
 * Utility to reset all user data and ensure the app behaves like a first-time user experience
 * This clears all localStorage, IndexedDB, and cookies to simulate a fresh install
 */
// Function to clear all localStorage items
const clearLocalStorage = () => {
  const keysToPreserve = []; // Empty array means clear everything
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (!keysToPreserve.includes(key)) {
      localStorage.removeItem(key);
    }
  });
};
// Function to clear all cookies
const clearCookies = () => {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
};
// Function to clear IndexedDB
const clearIndexedDB = async () => {
  try {
    // Get all database names
    const databases = await window.indexedDB.databases();
    // Delete each database
    const deletePromises = databases.map(db => {
      return new Promise((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(db.name);
        request.onerror = () => reject(new Error(`Failed to delete database: ${db.name}`));
        request.onsuccess = () => resolve();
      });
    });
    await Promise.all(deletePromises);
  } catch (error) {
  }
};
// Function to clear service worker caches
const clearCaches = async () => {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
  } catch (error) {
  }
};
// Main function to reset everything
export const resetToFirstTimeUser = async () => {
  clearLocalStorage();
  clearCookies();
  await clearIndexedDB();
  await clearCaches();
  // Set flag to indicate we're in first-time mode (will be cleared on next load)
  sessionStorage.setItem('firstTimeReset', 'true');
  return true;
};
// Function to check if the app should be redirected to register
export const shouldRedirectToRegister = () => {
  // Always return true - we always want to direct to register
  return true;
}; 