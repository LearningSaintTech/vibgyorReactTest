import fs from 'fs';

// Create .env file with Vite environment variables
const envContent = `# API Configuration
VITE_API_URL=https://192.168.1.54:3000

# Socket.IO Configuration
VITE_SOCKET_URL=https://192.168.1.54:3000

# Other Configuration
VITE_ENVIRONMENT=development
`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created successfully!');
  console.log('📝 Environment variables configured for Vite');
  console.log('🔧 API URL: https://192.168.1.54:3000');
  console.log('🔌 Socket URL: https://192.168.1.54:3000');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
}

