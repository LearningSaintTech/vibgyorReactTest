import { io } from 'socket.io-client';

/**
 * Enhanced Socket Service with comprehensive real-time features
 */
class EnhancedSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
    this.messageQueue = [];
    this.callHandlers = new Map();
    this.storedWebRTCEvents = new Map(); // Store WebRTC events for later processing
    
    // API base URL
    this.apiBaseUrl = import.meta.env.VITE_API_URL || 'https://vibgyornode.onrender.com';
  }

  /**
   * Connect to the socket server
   * @param {string} token - Authentication token
   * @returns {Promise<void>}
   */
  connect(token) {
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('[SOCKET] ⏳ Connection already in progress, waiting...');
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (!this.isConnecting) {
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    // If already connected with the same token, don't reconnect
    if (this.isConnected && this.authToken === token) {
      console.log('[SOCKET] ✅ Already connected with same token');
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      console.log('[SOCKET] 🔌 Connecting to socket server...');
      
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      // Store token for later use
      this.authToken = token;
      
      this.socket = io(this.apiBaseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 3, // Limit reconnection attempts
        reconnectionDelay: 2000, // Wait 2 seconds before reconnecting
        reconnectionDelayMax: 10000, // Max 10 seconds delay
        forceNew: true,
        autoConnect: true
      });

      // Connection success
      this.socket.on('connect', () => {
        console.log('[SOCKET] ✅ Connected successfully with ID:', this.socket.id);
        console.log('[SOCKET] 🔍 Current user ID from token:', this.getCurrentUserId());
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Process queued messages
        this.processMessageQueue();
        
        // Start heartbeat system
        this.startHeartbeat(30000); // 30 seconds
        
        // Emit connection success
        this.emitEvent('connection_success', {
          socketId: this.socket.id,
          userId: this.getCurrentUserId(),
          timestamp: new Date()
        });
        
        resolve();
      });

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('[SOCKET] ❌ Connection error:', error);
        this.isConnected = false;
        this.isConnecting = false;
        
        // Emit connection error
        this.emitEvent('connection_error', {
          error: error.message,
          timestamp: new Date()
        });
        
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('[SOCKET] 🔌 Disconnected:', reason);
        this.isConnected = false;
        this.isConnecting = false;
        
        // Emit disconnection
        this.emitEvent('disconnection', {
          reason,
          timestamp: new Date()
        });
        
        // Handle different disconnect reasons
        if (reason === 'io server disconnect') {
          // Server disconnected - this is expected when switching tabs
          // Let the socket handle reconnection automatically
          console.log('[SOCKET] 🔄 Server disconnected, letting socket handle reconnection automatically');
        }
      });

      // Reconnection attempts
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[SOCKET] 🔄 Reconnection attempt ${attemptNumber}`);
        this.reconnectAttempts = attemptNumber;
        
        // Prevent multiple reconnection attempts
        if (this.isConnecting) {
          console.log('[SOCKET] ⏳ Already connecting, skipping reconnection attempt');
          return;
        }
        
        this.emitEvent('reconnection_attempt', {
          attempt: attemptNumber,
          timestamp: new Date()
        });
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`[SOCKET] ✅ Reconnected after ${attemptNumber} attempts`);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        this.emitEvent('reconnection_success', {
          attempt: attemptNumber,
          timestamp: new Date()
        });
      });

      this.socket.on('reconnect_failed', () => {
        console.error('[SOCKET] ❌ Failed to reconnect after maximum attempts');
        this.isConnecting = false;
        
        this.emitEvent('reconnection_failed', {
          timestamp: new Date()
        });
      });

      // Setup event handlers
      this.setupEventHandlers();
      
      // Add general event listener for debugging
      this.socket.onAny((eventName, ...args) => {
        if (eventName.includes('webrtc')) {
          console.log(`[SOCKET_SERVICE] 🔍 Received WebRTC event '${eventName}':`, args);
        }
      });
    });
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    if (this.socket) {
      console.log('[SOCKET] 🔌 Manually disconnecting...');
      
      // Stop heartbeat before disconnecting
      this.stopHeartbeat();
      
      // Disconnect the socket
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
      
      // Clear all data
      this.eventListeners.clear();
      this.callHandlers.clear();
      this.messageQueue = [];
      this.reconnectAttempts = 0;
      this.authToken = null;
      
      console.log('[SOCKET] ✅ Disconnected successfully');
    }
  }

  /**
   * Setup all event handlers
   */
  setupEventHandlers() {
    if (!this.socket) {
      console.log('[SOCKET_SERVICE] ❌ Cannot setup event handlers - socket not connected');
      return;
    }
    
    console.log('[SOCKET_SERVICE] 🔌 Setting up event handlers for socket:', {
      connected: this.socket.connected,
      id: this.socket.id,
      readyState: this.socket.readyState
    });

    // Chat events
    this.socket.on('message_received', (data) => {
      this.emitEvent('message_received', data);
    });

    this.socket.on('message_reaction', (data) => {
      this.emitEvent('message_reaction', data);
    });

    this.socket.on('user_typing', (data) => {
      console.log('[SOCKET_SERVICE] ⌨️ Received user_typing event:', data);
      this.emitEvent('user_typing', data);
    });

    this.socket.on('user_joined_chat', (data) => {
      this.emitEvent('user_joined_chat', data);
    });

    this.socket.on('user_left_chat', (data) => {
      this.emitEvent('user_left_chat', data);
    });

    // Call events
    this.socket.on('call:incoming', (data) => {
      this.emitEvent('call_incoming', data);
    });

    this.socket.on('call:initiated', (data) => {
      this.emitEvent('call_initiated', data);
    });

    this.socket.on('call:accepted', (data) => {
      console.log('[SOCKET] 📞 Received call:accepted event from server:', data);
      this.emitEvent('call_accepted', data);
    });

    this.socket.on('call:rejected', (data) => {
      this.emitEvent('call_rejected', data);
    });

    this.socket.on('call:ended', (data) => {
      this.emitEvent('call_ended', data);
    });

    this.socket.on('call:error', (data) => {
      this.emitEvent('call_error', data);
    });

    // WebRTC events (Socket.IO converts colons to underscores)
    this.socket.on('webrtc_offer', (data) => {
      console.log('[SOCKET_SERVICE] 📡 Received webrtc_offer event:', data);
      console.log('[SOCKET_SERVICE] 🔍 WebRTC Offer Debug:', {
        callId: data.callId,
        hasOffer: !!data.offer,
        from: data.from,
        timestamp: data.timestamp
      });
      this.emitEvent('webrtc_offer', data);
    });

    this.socket.on('webrtc_answer', (data) => {
      console.log('[SOCKET_SERVICE] 📡 Received webrtc_answer event:', data);
      console.log('[SOCKET_SERVICE] 🔍 WebRTC Answer Debug:', {
        callId: data.callId,
        hasAnswer: !!data.answer,
        from: data.from,
        timestamp: data.timestamp
      });
      this.emitEvent('webrtc_answer', data);
    });

    this.socket.on('webrtc_ice_candidate', (data) => {
      console.log('[SOCKET_SERVICE] 📡 Received webrtc_ice_candidate event:', data);
      console.log('[SOCKET_SERVICE] 🔍 WebRTC ICE Candidate Debug:', {
        callId: data.callId,
        hasCandidate: !!data.candidate,
        from: data.from,
        timestamp: data.timestamp
      });
      this.emitEvent('webrtc_ice_candidate', data);
    });

    // Also listen for colon format events (in case Socket.IO doesn't convert them)
        this.socket.on('webrtc:offer', (data) => {
          console.log('[SOCKET_SERVICE] 📡 Received webrtc:offer event (colon format):', data);
          console.log('[SOCKET_SERVICE] 🔍 WebRTC Offer Debug (colon):', {
            callId: data.callId,
            hasOffer: !!data.offer,
            from: data.from,
            timestamp: data.timestamp,
            socketId: this.socket?.id,
            isConnected: this.isConnected,
            sdpType: data.offer?.type,
            sdpLength: data.offer?.sdp?.length || 0,
            mLineCount: data.offer?.sdp ? (data.offer.sdp.match(/^m=/gm) || []).length : 0
          });
          
          // Debug: Check listeners state before emitting
          console.log('[SOCKET_SERVICE] 🔍 Checking listeners state before emitting webrtc_offer...');
          this.getListenersDebugInfo();
          
          // Store the offer for later processing if no listeners are available
          if (!this.eventListeners.has('webrtc_offer') || this.eventListeners.get('webrtc_offer').size === 0) {
            console.log('[SOCKET_SERVICE] 💾 Storing offer for later processing - no listeners available');
            this.storeWebRTCEvent('webrtc_offer', data);
          }
          
          console.log('[SOCKET_SERVICE] 🔄 Emitting webrtc_offer to internal listeners...');
          this.emitEvent('webrtc_offer', data);
          console.log('[SOCKET_SERVICE] ✅ webrtc_offer emission completed');
        });

    this.socket.on('webrtc:answer', (data) => {
      console.log('[SOCKET_SERVICE] 📡 Received webrtc:answer event (colon format):', data);
      console.log('[SOCKET_SERVICE] 🔍 WebRTC Answer Debug (colon):', {
        callId: data.callId,
        hasAnswer: !!data.answer,
        from: data.from,
        timestamp: data.timestamp,
        socketId: this.socket?.id,
        isConnected: this.isConnected,
        sdpType: data.answer?.type,
        sdpLength: data.answer?.sdp?.length || 0,
        mLineCount: data.answer?.sdp ? (data.answer.sdp.match(/^m=/gm) || []).length : 0
      });
      this.emitEvent('webrtc_answer', data);
    });

    this.socket.on('webrtc:ice-candidate', (data) => {
      console.log('[SOCKET_SERVICE] 📡 Received webrtc:ice-candidate event (colon format):', data);
      console.log('[SOCKET_SERVICE] 🔍 WebRTC ICE Candidate Debug (colon):', {
        callId: data.callId,
        hasCandidate: !!data.candidate,
        from: data.from,
        timestamp: data.timestamp,
        socketId: this.socket?.id,
        isConnected: this.isConnected
      });
      
      // Debug: Check listeners state before emitting
      console.log('[SOCKET_SERVICE] 🔍 Checking listeners state before emitting webrtc_ice_candidate...');
      this.getListenersDebugInfo();
      
      // Store the ICE candidate for later processing if no listeners are available
      if (!this.eventListeners.has('webrtc_ice_candidate') || this.eventListeners.get('webrtc_ice_candidate').size === 0) {
        console.log('[SOCKET_SERVICE] 💾 Storing ICE candidate for later processing - no listeners available');
        this.storeWebRTCEvent('webrtc_ice_candidate', data);
      }
      
      console.log('[SOCKET_SERVICE] 🔄 Emitting webrtc_ice_candidate to internal listeners...');
      this.emitEvent('webrtc_ice_candidate', data);
      console.log('[SOCKET_SERVICE] ✅ webrtc_ice_candidate emission completed');
    });

    // User presence events
    this.socket.on('user_online', (data) => {
      console.log('[SOCKET] 🟢 User came online:', data);
      console.log('[SOCKET] 🔍 Current user ID:', this.getCurrentUserId() || 'unknown');
      console.log('[SOCKET] 🔍 Socket ID:', this.socket.id);
      this.emitEvent('user_online', data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('[SOCKET] 🔴 User went offline:', data);
      console.log('[SOCKET] 🔍 Current user ID:', this.getCurrentUserId() || 'unknown');
      console.log('[SOCKET] 🔍 Socket ID:', this.socket.id);
      this.emitEvent('user_offline', data);
    });

    this.socket.on('user_status_update', (data) => {
      this.emitEvent('user_status_update', data);
    });

    // Notification events
    this.socket.on('new_message_notification', (data) => {
      this.emitEvent('new_message_notification', data);
    });

    // Error events
    this.socket.on('error', (data) => {
      this.emitEvent('socket_error', data);
    });

    // Heartbeat
    this.socket.on('pong', () => {
      this.emitEvent('pong', { timestamp: new Date() });
    });
  }

  /**
   * Emit an event to listeners
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitEvent(event, data) {
    const listeners = this.eventListeners.get(event);
    console.log(`[SOCKET] 📡 Emitting event '${event}' to ${listeners ? listeners.size : 0} listeners:`, data);
    
    // Special debugging for WebRTC events
    if (event.includes('webrtc')) {
      console.log(`[SOCKET] 🔍 WebRTC Event Debug:`, {
        event,
        listenersCount: listeners ? listeners.size : 0,
        allListeners: Array.from(this.eventListeners.keys()).filter(k => k.includes('webrtc')),
        allEventListeners: Array.from(this.eventListeners.keys()),
        data: {
          callId: data.callId,
          type: data.type || 'unknown',
          hasOffer: !!data.offer,
          hasAnswer: !!data.answer,
          hasCandidate: !!data.candidate
        }
      });
      
      // If no listeners found, try to find similar events
      if (!listeners || listeners.size === 0) {
        const similarEvents = Array.from(this.eventListeners.keys()).filter(k => 
          k.includes('webrtc') && k.includes(event.split('_')[1])
        );
        console.log(`[SOCKET] 🔍 Looking for similar events:`, similarEvents);
      }
    }
    
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    } else {
      console.log(`[SOCKET] ⚠️ No listeners found for event '${event}'`);
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    
    // Debug WebRTC listener registration
    if (event.includes('webrtc')) {
      console.log(`[SOCKET] 🔌 WebRTC listener registered for '${event}':`, {
        totalListeners: this.eventListeners.get(event).size,
        allWebRTCEvents: Array.from(this.eventListeners.keys()).filter(k => k.includes('webrtc')),
        allEventListeners: Array.from(this.eventListeners.keys()),
        callbackType: typeof callback,
        callbackName: callback.name || 'anonymous'
      });
      
      // Process any stored events for this event type
      this.processStoredWebRTCEvents(event);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback (optional, if not provided clears all listeners)
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      if (callback) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      } else {
        // Clear all listeners for this event
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Get debug info about current listeners
   */
  getListenersDebugInfo() {
    const webrtcEvents = Array.from(this.eventListeners.keys()).filter(k => k.includes('webrtc'));
    const debugInfo = {
      totalEvents: this.eventListeners.size,
      webrtcEvents: webrtcEvents.map(event => ({
        event,
        listenerCount: this.eventListeners.get(event)?.size || 0
      })),
      allEvents: Array.from(this.eventListeners.keys()),
      storedWebRTCEvents: this.storedWebRTCEvents.size
    };
    console.log('[SOCKET] 🔍 Current listeners debug info:', debugInfo);
    return debugInfo;
  }

  /**
   * Store WebRTC event for later processing
   * @param {string} eventType - Event type (e.g., 'webrtc_offer')
   * @param {any} data - Event data
   */
  storeWebRTCEvent(eventType, data) {
    if (!this.storedWebRTCEvents.has(eventType)) {
      this.storedWebRTCEvents.set(eventType, []);
    }
    this.storedWebRTCEvents.get(eventType).push(data);
    console.log(`[SOCKET] 💾 Stored ${eventType} event for later processing. Total stored: ${this.storedWebRTCEvents.get(eventType).length}`);
  }

  /**
   * Process stored WebRTC events for a specific event type
   * @param {string} eventType - Event type to process
   */
  processStoredWebRTCEvents(eventType) {
    if (this.storedWebRTCEvents.has(eventType)) {
      const storedEvents = this.storedWebRTCEvents.get(eventType);
      console.log(`[SOCKET] 🔄 Processing ${storedEvents.length} stored ${eventType} events`);
      
      storedEvents.forEach(eventData => {
        console.log(`[SOCKET] 🔄 Re-emitting stored ${eventType} event:`, eventData);
        this.emitEvent(eventType, eventData);
      });
      
      // Clear processed events
      this.storedWebRTCEvents.delete(eventType);
    }
  }

  /**
   * Send message to server
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (!this.isConnected) {
      // Queue message for later
      this.messageQueue.push({ event, data });
      return;
    }

    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift();
      this.emit(event, data);
    }
  }

  /**
   * Send chat message
   * @param {string} chatId - Chat ID
   * @param {string} content - Message content
   * @param {string} type - Message type
   * @param {string} replyTo - Reply to message ID
   * @param {string} forwardedFrom - Forwarded from message ID
   */
  sendMessage(chatId, content, type = 'text', replyTo = null, forwardedFrom = null) {
    this.emit('new_message', {
      chatId,
      content,
      type,
      replyTo,
      forwardedFrom
    });
  }

  /**
   * Join chat room
   * @param {string} chatId - Chat ID
   */
  joinChat(chatId) {
    this.emit('join_chat', chatId);
  }

  /**
   * Leave chat room
   * @param {string} chatId - Chat ID
   */
  leaveChat(chatId) {
    this.emit('leave_chat', chatId);
  }

  /**
   * Start typing indicator
   * @param {string} chatId - Chat ID
   */
  startTyping(chatId) {
    console.log('[SOCKET_SERVICE] ⌨️ Starting typing for chat:', chatId);
    this.emit('typing_start', { chatId });
  }

  /**
   * Stop typing indicator
   * @param {string} chatId - Chat ID
   */
  stopTyping(chatId) {
    console.log('[SOCKET_SERVICE] ⌨️ Stopping typing for chat:', chatId);
    this.emit('typing_stop', { chatId });
  }

  /**
   * Initiate call
   * @param {string} chatId - Chat ID
   * @param {string} type - Call type (audio/video)
   * @param {string} targetUserId - Target user ID
   */
  initiateCall(chatId, type, targetUserId) {
    this.emit('call:initiate', {
      chatId,
      type,
      targetUserId
    });
  }

  /**
   * Accept call
   * @param {string} callId - Call ID
   */
  acceptCall(callId) {
    this.emit('call:accept', { callId });
  }

  /**
   * Reject call
   * @param {string} callId - Call ID
   * @param {string} reason - Rejection reason
   */
  rejectCall(callId, reason = 'Call rejected') {
    this.emit('call:reject', { callId, reason });
  }

  /**
   * End call
   * @param {string} callId - Call ID
   * @param {string} reason - End reason
   */
  endCall(callId, reason = 'user_ended') {
    this.emit('call:end', { callId, reason });
  }

  /**
   * Send WebRTC offer
   * @param {string} callId - Call ID
   * @param {RTCSessionDescriptionInit} offer - WebRTC offer
   * @param {string} targetUserId - Target user ID
   */
  sendOffer(callId, offer, targetUserId) {
    this.emit('webrtc:offer', {
      callId,
      offer,
      targetUserId
    });
  }

  /**
   * Send WebRTC answer
   * @param {string} callId - Call ID
   * @param {RTCSessionDescriptionInit} answer - WebRTC answer
   * @param {string} targetUserId - Target user ID
   */
  sendAnswer(callId, answer, targetUserId) {
    this.emit('webrtc:answer', {
      callId,
      answer,
      targetUserId
    });
  }

  /**
   * Send ICE candidate
   * @param {string} callId - Call ID
   * @param {RTCIceCandidateInit} candidate - ICE candidate
   * @param {string} targetUserId - Target user ID
   */
  sendIceCandidate(callId, candidate, targetUserId) {
    this.emit('webrtc:ice-candidate', {
      callId,
      candidate,
      targetUserId
    });
  }

  /**
   * Update user status
   * @param {string} status - User status
   */
  updateStatus(status) {
    this.emit('update_status', { status });
  }

  /**
   * Send ping for heartbeat
   */
  ping() {
    this.emit('ping');
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  isConnectedToServer() {
    return this.isConnected && this.socket?.connected;
  }

  /**
   * Get socket ID
   * @returns {string|null} Socket ID
   */
  getSocketId() {
    return this.socket?.id || null;
  }

  /**
   * Get current user ID from token
   * @returns {string|null} User ID
   */
  getCurrentUserId() {
    if (!this.authToken) return null;
    
    try {
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(this.authToken.split('.')[1]));
      return payload.userId || null;
    } catch (error) {
      console.error('[SOCKET] Error decoding token:', error);
      return null;
    }
  }

  /**
   * Reconnect manually
   */
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  /**
   * Set call handler for specific call
   * @param {string} callId - Call ID
   * @param {Object} handlers - Call event handlers
   */
  setCallHandler(callId, handlers) {
    this.callHandlers.set(callId, handlers);
  }

  /**
   * Remove call handler
   * @param {string} callId - Call ID
   */
  removeCallHandler(callId) {
    this.callHandlers.delete(callId);
  }

  /**
   * Get call handler
   * @param {string} callId - Call ID
   * @returns {Object|null} Call handlers
   */
  getCallHandler(callId) {
    return this.callHandlers.get(callId) || null;
  }

  /**
   * Start heartbeat interval
   * @param {number} interval - Heartbeat interval in milliseconds
   */
  startHeartbeat(interval = 30000) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, interval);
  }

  /**
   * Stop heartbeat interval
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.stopHeartbeat();
    this.disconnect();
    this.eventListeners.clear();
    this.callHandlers.clear();
    this.messageQueue = [];
  }
}

// Create singleton instance
const enhancedSocketService = new EnhancedSocketService();

export default enhancedSocketService;
