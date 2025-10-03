import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  
  // HTTPS configuration only for local development
  let httpsConfig = false;
  if (isDevelopment) {
    try {
      const keyPath = path.resolve(__dirname, '../vibgyor-backend/localhost+3-key.pem');
      const certPath = path.resolve(__dirname, '../vibgyor-backend/localhost+3.pem');
      
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        httpsConfig = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        };
        console.log('🔒 HTTPS enabled for local development');
      } else {
        console.log('⚠️  HTTPS certificates not found, using HTTP for local development');
      }
    } catch (error) {
      console.log('⚠️  Error loading HTTPS certificates, using HTTP for local development');
    }
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Allow access from other devices on the network
      port: 5173, // Default Vite port
      strictPort: true, // Don't try other ports if 5173 is busy
      https: httpsConfig
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
