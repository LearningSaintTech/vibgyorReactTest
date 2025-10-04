import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Allow access from other devices on the network
      port: 5173, // Default Vite port
      strictPort: true, // Don't try other ports if 5173 is busy
    },
    build: {
      // Production build configuration
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild', // Use esbuild instead of terser (faster and built-in)
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            socket: ['socket.io-client']
          }
        }
      }
    }
  };
})
