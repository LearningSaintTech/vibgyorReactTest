# Vibgyor Frontend

A modern React.js frontend application for the Vibgyor social messaging platform, built with Tailwind CSS and integrated with all user-side APIs.

## 🚀 Features

### ✅ Implemented
- **Authentication System** - Phone OTP and Email OTP verification
- **Profile Management** - Complete profile setup and editing
- **File Uploads** - Profile picture and ID proof uploads
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Real-time Socket.IO** - WebSocket integration for live features
- **API Integration** - Complete integration with all 79 user endpoints

### 🔄 In Development
- **Chat System** - Real-time messaging with file attachments
- **Social Features** - Follow requests, blocking, reporting
- **Audio/Video Calls** - WebRTC calling functionality
- **User Status** - Online status and presence tracking
- **Message Requests** - Permission-based messaging system

## 🛠️ Tech Stack

- **Frontend**: React.js 18 with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Icons**: Lucide React
- **State Management**: React Context API

## 📦 Installation

1. **Clone the repository**
   ```bash
   cd vibgyor-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Update `src/config/environment.js` with your API endpoints
   - Set `REACT_APP_API_URL` to your backend URL (default: http://192.168.1.54:3000)

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://192.168.1.54:3000
REACT_APP_SOCKET_URL=http://192.168.1.54:3000
REACT_APP_ENVIRONMENT=development
```

### API Integration
The application includes complete API integration for all user endpoints:

- **Authentication APIs** (9 endpoints)
- **Social Features APIs** (16 endpoints)
- **Chat Management APIs** (8 endpoints)
- **Message Management APIs** (10 endpoints)
- **Message Request APIs** (9 endpoints)
- **User Status APIs** (7 endpoints)
- **Call Management APIs** (10 endpoints)
- **File Upload APIs** (2 endpoints)
- **Catalog APIs** (7 endpoints)
- **Username APIs** (2 endpoints)

## 📱 Pages & Features

### 🔐 Authentication
- **Login Page** - Phone OTP verification with optional email setup
- **OTP Verification** - Secure OTP-based authentication
- **Profile Setup** - Complete user profile configuration

### 👤 Profile Management
- **Profile Page** - Edit personal information, bio, location
- **Profile Picture Upload** - Image upload with S3 integration
- **ID Verification** - Document upload for account verification

### 💬 Messaging (Coming Soon)
- **Chat Interface** - Real-time messaging with file attachments
- **Message Requests** - Permission-based messaging system
- **Message History** - Search and manage chat history

### 👥 Social Features (Coming Soon)
- **Follow System** - Send and manage follow requests
- **User Discovery** - Find and connect with other users
- **Blocking System** - Block and manage blocked users
- **Reporting System** - Report inappropriate content

### 📞 Calling (Coming Soon)
- **Audio Calls** - High-quality voice calls
- **Video Calls** - Face-to-face video communication
- **Call History** - Track and manage call logs

### 📊 Status System (Coming Soon)
- **Online Status** - Show online/offline status
- **Custom Status** - Set custom status messages
- **Privacy Controls** - Control status visibility

## 🎨 Design System

### Colors
- **Primary**: Blue theme with multiple shades
- **Secondary**: Gray scale for text and backgrounds
- **Status Colors**: Green, red, yellow for different states

### Components
- **Buttons**: Primary, secondary, outline, danger variants
- **Inputs**: Form inputs with validation states
- **Cards**: Consistent card layouts
- **Loading States**: Spinners and skeleton loaders

## 🔌 API Integration

### Authentication Flow
1. User enters phone number
2. OTP sent to phone
3. User verifies OTP
4. Access tokens stored
5. Optional email verification

### Real-time Features
- **Socket.IO Integration** - Real-time messaging and notifications
- **WebRTC Support** - Audio/video calling capabilities
- **Live Updates** - Real-time status and presence

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker (Optional)
```bash
docker build -t vibgyor-frontend .
docker run -p 3000:3000 vibgyor-frontend
```

## 📝 API Endpoints

The frontend integrates with all 79 user endpoints from the backend:

### Authentication (9 endpoints)
- `POST /user/auth/send-otp` - Send phone OTP
- `POST /user/auth/verify-otp` - Verify phone OTP
- `POST /user/auth/resend-otp` - Resend phone OTP
- `POST /user/auth/email/send-otp` - Send email OTP
- `POST /user/auth/email/verify-otp` - Verify email OTP
- `POST /user/auth/email/resend-otp` - Resend email OTP
- `GET /user/auth/me` - Get user profile
- `GET /user/auth/profile` - Get detailed profile
- `PUT /user/auth/profile` - Update profile

### And 70 more endpoints for complete functionality...

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Vibgyor social messaging platform.

## 🔗 Related Projects

- **Backend API**: Node.js/Express backend with 117 total endpoints
- **Admin Panel**: Administrative interface (coming soon)
- **Mobile App**: React Native mobile application (coming soon)

---

**Built with ❤️ for the Vibgyor platform**