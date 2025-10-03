const os = require('os');

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        addresses.push({
          interface: name,
          address: interface.address,
          url: `https://${interface.address}:5173`
        });
      }
    }
  }

  return addresses;
}

const networkInfo = getNetworkInfo();

console.log('🌐 Network Information for Vibgyor Frontend:');
console.log('==========================================');

if (networkInfo.length === 0) {
  console.log('❌ No network interfaces found');
  console.log('Make sure you are connected to a network');
} else {
  console.log('📱 Access your app from other devices using these URLs:');
  console.log('');
  
  networkInfo.forEach((info, index) => {
    console.log(`${index + 1}. ${info.interface}: ${info.url}`);
  });
  
  console.log('');
  console.log('💡 Tips:');
  console.log('- Make sure all devices are on the same network (WiFi/LAN)');
  console.log('- Check Windows Firewall settings if connection fails');
  console.log('- Use the IP address that starts with 192.168.x.x or 10.x.x.x');
  console.log('');
  console.log('🔧 If you need to restart the dev server:');
  console.log('   npm run dev');
}

module.exports = { getNetworkInfo };
