/**
 * Utility functions for scroll management
 */

/**
 * Scroll to top of the page with smooth animation
 */
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Scroll to top of the page instantly (no animation)
 */
export const scrollToTopInstant = () => {
  window.scrollTo({ top: 0, behavior: 'auto' });
};

/**
 * Scroll to a specific element by ID
 */
export const scrollToElement = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * Scroll to a specific element by selector
 */
export const scrollToSelector = (selector: string) => {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * Check if element is in viewport
 */
export const isInViewport = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}; 