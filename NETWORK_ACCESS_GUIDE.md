# Network Access Guide for Vibgyor Frontend

This guide explains how to access your Vibgyor frontend application from other devices on the same network.

## Quick Setup

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Get Network Information
```bash
npm run network
```

This will show you the IP addresses you can use to access the app from other devices.

## Configuration Changes Made

### Vite Configuration (`vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from other devices
    port: 5173, // Default Vite port
    strictPort: true, // Don't try other ports if 5173 is busy
  },
})
```

### Package.json Scripts
- `npm run dev` - Starts server accessible from network
- `npm run dev:local` - Starts server only accessible from localhost
- `npm run network` - Shows network IP addresses

## Accessing from Other Devices

### Step 1: Find Your Computer's IP Address
Run this command in the frontend directory:
```bash
npm run network
```

You'll see output like:
```
🌐 Network Information for Vibgyor Frontend:
==========================================
📱 Access your app from other devices using these URLs:

1. Wi-Fi: http://192.168.1.100:5173
2. Ethernet: http://192.168.1.101:5173
```

### Step 2: Use the IP Address
On other devices (phones, tablets, other computers), open a web browser and navigate to:
```
http://YOUR_IP_ADDRESS:5173
```

For example: `http://192.168.1.100:5173`

## Troubleshooting

### Issue: "This site can't be reached"
**Solutions:**
1. **Check Windows Firewall**
   - Go to Windows Defender Firewall
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Find "Node.js" and ensure both Private and Public are checked
   - If Node.js isn't listed, click "Allow another app" and add it

2. **Check Network Connection**
   - Ensure all devices are on the same WiFi network
   - Try pinging the IP address from another device

3. **Check Port Availability**
   - Make sure port 5173 isn't blocked by your router
   - Try a different port if needed

### Issue: "Connection refused"
**Solutions:**
1. **Restart the dev server**
   ```bash
   npm run dev
   ```

2. **Check if server is running**
   - Look for "Local: http://localhost:5173/" in terminal
   - Look for "Network: http://192.168.x.x:5173/" in terminal

### Issue: "Page loads but API calls fail"
**Solutions:**
1. **Update API Base URL**
   - The frontend might be trying to connect to `localhost:3000` for the backend
   - Update the API configuration to use your computer's IP address

2. **Check Backend Server**
   - Make sure the backend is also accessible from the network
   - Update backend CORS settings if needed

## Manual IP Address Finding

If the script doesn't work, you can find your IP address manually:

### Windows
```cmd
ipconfig
```
Look for "IPv4 Address" under your network adapter.

### Mac/Linux
```bash
ifconfig
```
Look for "inet" addresses (not 127.0.0.1).

## Security Notes

⚠️ **Important Security Considerations:**

1. **Development Only**: This setup is for development only. Don't use `0.0.0.0` in production.

2. **Network Security**: Anyone on your network can access the app. Make sure you trust your network.

3. **Firewall**: Consider your firewall settings when allowing network access.

## Common Network IP Ranges

- **Home Networks**: Usually `192.168.x.x` or `10.x.x.x`
- **Corporate Networks**: Often `172.16.x.x` to `172.31.x.x`
- **Mobile Hotspots**: Usually `192.168.x.x`

## Testing Network Access

1. **From the same computer**: `http://localhost:5173`
2. **From another device**: `http://YOUR_IP:5173`
3. **From mobile device**: Use the same IP address

## Backend Configuration

If you also need to access the backend from other devices, make sure your backend server is configured similarly:

```javascript
// In your backend server configuration
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
```

And update your frontend API configuration to use the IP address instead of localhost.

## Quick Commands

```bash
# Start dev server (network accessible)
npm run dev

# Get network information
npm run network

# Start dev server (localhost only)
npm run dev:local
```

## Still Having Issues?

1. Check Windows Firewall settings
2. Ensure all devices are on the same network
3. Try disabling antivirus temporarily
4. Check router settings for port blocking
5. Verify the development server is actually running and accessible
