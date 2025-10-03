// Environment Configuration
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'https://vibgyornode.onrender.com',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'https://vibgyornode.onrender.com',
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'production',
};

export default config;
