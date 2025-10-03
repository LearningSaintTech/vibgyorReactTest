import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vibgyornode.onrender.com';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network errors gracefully
    if (!error.response) {
      // Network error - don't redirect to login
      error.code = 'NETWORK_ERROR';
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Token expired - since there's no refresh endpoint, just clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      // Let the component handle the redirect
    }
    return Promise.reject(error);
  }
);

// API Service Functions
export const authAPI = {
  // Phone OTP
  sendPhoneOTP: (phoneNumber, countryCode = '+91') =>
    api.post('/user/auth/send-otp', { phoneNumber, countryCode }),
  
  verifyPhoneOTP: (phoneNumber, otp) =>
    api.post('/user/auth/verify-otp', { phoneNumber, otp }),
  
  resendPhoneOTP: (phoneNumber) =>
    api.post('/user/auth/resend-otp', { phoneNumber }),

  // Email OTP
  sendEmailOTP: (email) =>
    api.post('/user/auth/email/send-otp', { email }),
  
  verifyEmailOTP: (otp) =>
    api.post('/user/auth/email/verify-otp', { otp }),
  
  resendEmailOTP: (email) =>
    api.post('/user/auth/email/resend-otp', { email }),

  // Profile
  getProfile: () =>
    api.get('/user/auth/profile'),
  
  getMe: () =>
    api.get('/user/auth/me'),
  
  updateProfile: (profileData) =>
    api.put('/user/auth/profile', profileData),
};

export const socialAPI = {
  // Follow Requests
  sendFollowRequest: (userId, message = '') =>
    api.post(`/user/social/follow-request/${userId}`, { message }),
  
  acceptFollowRequest: (requestId) =>
    api.post(`/user/social/follow-request/${requestId}/accept`),
  
  rejectFollowRequest: (requestId) =>
    api.post(`/user/social/follow-request/${requestId}/reject`),
  
  cancelFollowRequest: (requestId) =>
    api.delete(`/user/social/follow-request/${requestId}/cancel`),
  
  getPendingFollowRequests: (page = 1, limit = 20) =>
    api.get(`/user/social/follow-requests/pending?page=${page}&limit=${limit}`),
  
  getSentFollowRequests: (page = 1, limit = 20, status = 'all') =>
    api.get(`/user/social/follow-requests/sent?page=${page}&limit=${limit}&status=${status}`),

  // Follow/Unfollow
  unfollowUser: (userId) =>
    api.delete(`/user/social/follow/${userId}`),
  
  getFollowers: (page = 1, limit = 20) =>
    api.get(`/user/social/followers?page=${page}&limit=${limit}`),
  
  getFollowing: (page = 1, limit = 20) =>
    api.get(`/user/social/following?page=${page}&limit=${limit}`),

  // Block/Unblock
  blockUser: (userId) =>
    api.post(`/user/social/block/${userId}`),
  
  unblockUser: (userId) =>
    api.delete(`/user/social/block/${userId}`),
  
  getBlockedUsers: (page = 1, limit = 20) =>
    api.get(`/user/social/blocked?page=${page}&limit=${limit}`),

  // Report
  reportUser: (userId, reportData) =>
    api.post(`/user/social/report/${userId}`, reportData),
  
  getUserReports: (page = 1, limit = 10) =>
    api.get(`/user/social/reports?page=${page}&limit=${limit}`),
  
  getSocialStats: () =>
    api.get('/user/social/social-stats'),
};

export const chatAPI = {
  // Chat Management
  createOrGetChat: (userId) =>
    api.post(`/user/chats/${userId}`),
  
  getUserChats: (page = 1, limit = 20) =>
    api.get(`/user/chats?page=${page}&limit=${limit}`),
  
  getChatDetails: (chatId) =>
    api.get(`/user/chats/${chatId}`),
  
  updateChatSettings: (chatId, settings) =>
    api.put(`/user/chats/${chatId}`, settings),
  
  deleteChat: (chatId) =>
    api.delete(`/user/chats/${chatId}`),
  
  searchChats: (query, page = 1, limit = 20) =>
    api.get(`/user/chats/search?query=${query}&page=${page}&limit=${limit}`),
  
  getChatStats: () =>
    api.get('/api/v1/user/chats/stats'),
  
  getTypingUsers: (chatId) =>
    api.get(`/user/chats/${chatId}/typing`),
};

export const messageAPI = {
  // Messages
  sendMessage: (chatId, messageData) =>
    api.post(`/user/messages/chats/${chatId}/messages`, messageData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  getChatMessages: (chatId, page = 1, limit = 20) =>
    api.get(`/user/messages/chats/${chatId}/messages?page=${page}&limit=${limit}`),
  
  markMessagesAsRead: (chatId) =>
    api.post(`/user/messages/chats/${chatId}/messages/read`),
  
  editMessage: (messageId, content) =>
    api.put(`/user/messages/${messageId}`, { content }),
  
  deleteMessage: (messageId) =>
    api.delete(`/user/messages/${messageId}`),
  
  reactToMessage: (messageId, emoji) =>
    api.post(`/user/messages/${messageId}/react`, { emoji }),
  
  removeReaction: (messageId) =>
    api.delete(`/user/messages/${messageId}/react`),
  
  searchMessages: (chatId, query, page = 1, limit = 20) =>
    api.get(`/user/messages/chats/${chatId}/messages/search?query=${query}&page=${page}&limit=${limit}`),
  
  forwardMessage: (messageId, targetChatId) =>
    api.post(`/user/messages/${messageId}/forward`, { targetChatId }),
  
  getChatMedia: (chatId, page = 1, limit = 20) =>
    api.get(`/user/messages/chats/${chatId}/media?page=${page}&limit=${limit}`),
  
  getMessageDetails: (messageId) =>
    api.get(`/user/messages/${messageId}`),
};

export const messageRequestAPI = {
  // Message Requests
  sendMessageRequest: (userId) =>
    api.post(`/user/message-requests/${userId}`),
  
  getPendingRequests: (page = 1, limit = 20) =>
    api.get(`/user/message-requests/pending?page=${page}&limit=${limit}`),
  
  getSentRequests: (page = 1, limit = 20) =>
    api.get(`/user/message-requests/sent?page=${page}&limit=${limit}`),
  
  acceptMessageRequest: (requestId) =>
    api.post(`/user/message-requests/${requestId}/accept`),
  
  rejectMessageRequest: (requestId) =>
    api.post(`/user/message-requests/${requestId}/reject`),
  
  deleteMessageRequest: (requestId) =>
    api.delete(`/user/message-requests/${requestId}`),
  
  getMessageRequestDetails: (requestId) =>
    api.get(`/user/message-requests/${requestId}`),
  
  getMessageRequestStats: () =>
    api.get('/user/message-requests/stats'),
  
  getRequestBetweenUsers: (userId) =>
    api.get(`/user/message-requests/between/${userId}`),
};

export const statusAPI = {
  // User Status
  updateUserStatus: (statusData) =>
    api.put('/user/status', statusData),
  
  getUserStatus: (userId) =>
    api.get(`/user/status/${userId}`),
  
  getOnlineUsers: () =>
    api.get('/user/status/online'),
  
  getRecentlyActiveUsers: () =>
    api.get('/user/status/recent'),
  
  getUserStatuses: (userIds) =>
    api.post('/user/status/batch', { userIds }),
  
  updatePrivacySettings: (privacySettings) =>
    api.put('/user/status/privacy', privacySettings),
  
  getStatusStats: () =>
    api.get('/user/status/stats'),
};

export const callAPI = {
  // Call Management
  initiateCall: (chatId, type = 'audio') =>
    api.post('/user/calls/initiate', { chatId, type }),
  
  acceptCall: (callId, signalingData = {}) =>
    api.post(`/user/calls/${callId}/accept`, { signalingData }),
  
  rejectCall: (callId, reason = '') =>
    api.post(`/user/calls/${callId}/reject`, { reason }),
  
  endCall: (callId, reason = '') =>
    api.post(`/user/calls/${callId}/end`, { reason }),
  
  getCallStatus: (callId) =>
    api.get(`/user/calls/${callId}/status`),
  
  getCallHistory: (chatId, page = 1, limit = 20, type = 'audio') =>
    api.get(`/user/calls/chats/${chatId}/call-history?page=${page}&limit=${limit}&type=${type}`),
  
  getCallStats: () =>
    api.get('/user/calls/stats'),
  
  updateCallSettings: (callId, settings) =>
    api.put(`/user/calls/${callId}/settings`, settings),
  
  handleSignaling: (callId, signalingData) =>
    api.post(`/user/calls/${callId}/signaling`, signalingData),
  
  getActiveCall: (chatId) =>
    api.get(`/user/calls/chats/${chatId}/active-call`),
};

export const uploadAPI = {
  // File Upload
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/user/upload/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  uploadIdProof: (file, documentType, documentNumber) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('documentNumber', documentNumber);
    return api.post('/user/upload/id-proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const catalogAPI = {
  // Catalog Management
  getCatalog: () =>
    api.get('/user/catalog'),
  
  getSpecificList: (listType) =>
    api.get(`/user/catalog/${listType}`),
  
  createCatalog: (catalogData) =>
    api.post('/user/catalog', catalogData),
  
  updateCatalog: (catalogData) =>
    api.put('/user/catalog', catalogData),
  
  addToList: (listType, items) =>
    api.patch('/user/catalog/add', { listType, items }),
  
  removeFromList: (listType, items) =>
    api.patch('/user/catalog/remove', { listType, items }),
  
  deleteCatalog: () =>
    api.delete('/user/catalog'),
};

export const usernameAPI = {
  // Username System
  checkAvailability: (username) =>
    api.get(`/user/username/available?u=${username}`),
  
  getSuggestions: (base) =>
    api.get(`/user/username/suggest?base=${base}`),
};

export default api;
