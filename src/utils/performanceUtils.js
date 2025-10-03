/**
 * Performance utilities for frontend optimization
 */

// Debounce function
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Image lazy loading utility
export const lazyLoadImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
};

// Virtual scrolling utility
export const createVirtualScroller = (container, itemHeight, totalItems, renderItem) => {
  let scrollTop = 0;
  let containerHeight = container.clientHeight;
  
  const updateVisibleItems = () => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      totalItems
    );
    
    const visibleItems = [];
    for (let i = startIndex; i < endIndex; i++) {
      visibleItems.push({
        index: i,
        item: renderItem(i),
        top: i * itemHeight
      });
    }
    
    return visibleItems;
  };
  
  const handleScroll = throttle((e) => {
    scrollTop = e.target.scrollTop;
    const visibleItems = updateVisibleItems();
    
    // Update DOM with visible items
    container.innerHTML = '';
    visibleItems.forEach(({ item, top }) => {
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.top = `${top}px`;
      element.style.height = `${itemHeight}px`;
      element.style.width = '100%';
      element.appendChild(item);
      container.appendChild(element);
    });
  }, 16); // ~60fps
  
  container.addEventListener('scroll', handleScroll);
  
  // Initial render
  container.style.height = `${totalItems * itemHeight}px`;
  handleScroll({ target: container });
  
  return {
    destroy: () => {
      container.removeEventListener('scroll', handleScroll);
    }
  };
};

// Memory management utility
export const createMemoryManager = () => {
  const cache = new Map();
  const maxSize = 100; // Maximum number of cached items
  
  const get = (key) => {
    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    return null;
  };
  
  const set = (key, value) => {
    if (cache.size >= maxSize) {
      // Remove least recently used item
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(key, value);
  };
  
  const clear = () => {
    cache.clear();
  };
  
  const size = () => {
    return cache.size;
  };
  
  return { get, set, clear, size };
};

// Performance monitoring
export const createPerformanceMonitor = () => {
  const metrics = {
    pageLoad: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0
  };
  
  const measurePageLoad = () => {
    if ('performance' in window) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        metrics.pageLoad = navigation.loadEventEnd - navigation.loadEventStart;
      });
    }
  };
  
  const measureWebVitals = () => {
    if ('web-vital' in window) {
      // This would require the web-vitals library
      // import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
      
      // getCLS((metric) => {
      //   metrics.cumulativeLayoutShift = metric.value;
      // });
      
      // getFID((metric) => {
      //   metrics.firstInputDelay = metric.value;
      // });
      
      // getFCP((metric) => {
      //   metrics.firstContentfulPaint = metric.value;
      // });
      
      // getLCP((metric) => {
      //   metrics.largestContentfulPaint = metric.value;
      // });
    }
  };
  
  const measureCustomTiming = (name, startTime) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  };
  
  const getMetrics = () => {
    return { ...metrics };
  };
  
  // Initialize monitoring
  measurePageLoad();
  measureWebVitals();
  
  return {
    getMetrics,
    measureCustomTiming
  };
};

// Bundle size optimization
export const createCodeSplitting = () => {
  const loadComponent = (importFunction) => {
    return React.lazy(() => importFunction().catch(error => {
      console.error('Failed to load component:', error);
      return { default: () => <div>Error loading component</div> };
    }));
  };
  
  const preloadComponent = (importFunction) => {
    importFunction();
  };
  
  return {
    loadComponent,
    preloadComponent
  };
};

// Image optimization utility
export const optimizeImage = (src, options = {}) => {
  const {
    width = null,
    height = null,
    quality = 80,
    format = 'webp'
  } = options;
  
  // If using a CDN service like Cloudinary, ImageKit, etc.
  if (src.includes('cloudinary.com') || src.includes('imagekit.io')) {
    let optimizedSrc = src;
    
    if (width) optimizedSrc += `w_${width},`;
    if (height) optimizedSrc += `h_${height},`;
    optimizedSrc += `q_${quality},f_${format}`;
    
    return optimizedSrc;
  }
  
  // For local images, you might want to use a service worker
  // or server-side image processing
  return src;
};

// Network optimization
export const createNetworkOptimizer = () => {
  const isOnline = navigator.onLine;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  const getConnectionSpeed = () => {
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  };
  
  const shouldUseLowQuality = () => {
    const connectionInfo = getConnectionSpeed();
    return connectionInfo?.effectiveType === 'slow-2g' || 
           connectionInfo?.effectiveType === '2g' ||
           connectionInfo?.saveData;
  };
  
  const preloadCriticalResources = (resources) => {
    if (isOnline && !shouldUseLowQuality()) {
      resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        if (resource.type) link.type = resource.type;
        document.head.appendChild(link);
      });
    }
  };
  
  return {
    isOnline,
    getConnectionSpeed,
    shouldUseLowQuality,
    preloadCriticalResources
  };
};

// Cache management
export const createCacheManager = () => {
  const CACHE_NAME = 'vibgyor-cache-v1';
  const CACHE_URLS = [
    '/',
    '/static/js/bundle.js',
    '/static/css/main.css'
  ];
  
  const openCache = async () => {
    return await caches.open(CACHE_NAME);
  };
  
  const cacheResource = async (url, response) => {
    const cache = await openCache();
    await cache.put(url, response);
  };
  
  const getCachedResource = async (url) => {
    const cache = await openCache();
    return await cache.match(url);
  };
  
  const clearCache = async () => {
    const cache = await openCache();
    await cache.delete(url);
  };
  
  const clearAllCaches = async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  };
  
  return {
    cacheResource,
    getCachedResource,
    clearCache,
    clearAllCaches
  };
};

// Error boundary utility
export const createErrorBoundary = () => {
  const errorHandler = (error, errorInfo) => {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    // Send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to Sentry, LogRocket, etc.
      // Sentry.captureException(error, { extra: errorInfo });
    }
  };
  
  return { errorHandler };
};

// Performance utilities export
export default {
  debounce,
  throttle,
  lazyLoadImages,
  createVirtualScroller,
  createMemoryManager,
  createPerformanceMonitor,
  createCodeSplitting,
  optimizeImage,
  createNetworkOptimizer,
  createCacheManager,
  createErrorBoundary
};
