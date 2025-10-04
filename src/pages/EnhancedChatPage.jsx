import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Video, MessageCircle, PhoneOff, Plus, MoreVertical } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/enhancedChatService';
import messageService from '../services/enhancedMessageService';
import callService from '../services/enhancedCallService';
import enhancedSocketService from '../services/enhancedSocketService';
import enhancedApiService from '../services/enhancedApiService';
import EnhancedChatList from '../components/Chat/EnhancedChatList';
import EnhancedMessageList from '../components/Chat/EnhancedMessageList';
import EnhancedAudioCall from '../components/Call/EnhancedAudioCall';
import EnhancedVideoCall from '../components/Call/EnhancedVideoCall';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Button from '../components/UI/Button';

/**
 * Enhanced Chat Page with comprehensive chat and calling functionality
 */
const EnhancedChatPage = () => {
  const { chatId } = useParams();
  const { user } = useAuth();
  
  // State management
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showChatList, setShowChatList] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const listenersSetupRef = useRef(false);

  // Load chat details when chatId changes
  useEffect(() => {
    if (chatId) {
      loadChatDetails(chatId);
      checkForActiveCall(chatId);
    } else {
      setSelectedChat(null);
      setActiveCall(null);
    }
  }, [chatId]);

  // Handle online users update from chat list
  const handleOnlineUsersUpdate = (newOnlineUsers) => {
    console.log('[CHAT_PAGE] 📡 Received online users update:', Array.from(newOnlineUsers));
    setOnlineUsers(newOnlineUsers);
  };

  // Fetch initial online users
  const fetchInitialOnlineUsers = async () => {
    try {
      console.log('[CHAT_PAGE] 🔍 Fetching initial online users...');
      
      // Check if we have a token
      const token = localStorage.getItem('accessToken');
      console.log('[CHAT_PAGE] 🔑 Token present:', token ? 'yes' : 'no');
      console.log('[CHAT_PAGE] 🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'none');
      
      // Use the enhanced API service for proper base URL and auth handling
      const response = await enhancedApiService.get(`/user/status/online?t=${Date.now()}`);
      
      console.log('[CHAT_PAGE] 📡 API Response:', response);
      
      if (response.success && response.data) {
        const onlineUserIds = response.data.map(user => user._id || user.userId);
        console.log('[CHAT_PAGE] 📋 Initial online users:', onlineUserIds);
        setOnlineUsers(new Set(onlineUserIds));
      }
    } catch (error) {
      console.error('[CHAT_PAGE] ❌ Error fetching initial online users:', error);
      console.error('[CHAT_PAGE] ❌ Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
    }
  };

  // Setup socket listeners for online/offline status
  useEffect(() => {
    // Prevent infinite loops by checking if listeners are already set up
    if (listenersSetupRef.current) {
      console.log('[CHAT_PAGE] ⚠️ Listeners already set up, skipping...');
      return;
    }

    console.log('[CHAT_PAGE] 🔌 Setting up socket listeners for online/offline status');
    console.log('[CHAT_PAGE] 🔍 Socket connected:', enhancedSocketService.isConnected);
    console.log('[CHAT_PAGE] 🔍 Current user:', user);
    
    const handleUserOnline = (data) => {
      console.log('[CHAT_PAGE] 🟢 User came online:', data);
      setOnlineUsers(prev => {
        console.log('[CHAT_PAGE] 🔍 Current onlineUsers before update:', Array.from(prev));
        const newSet = new Set(prev);
        newSet.add(data.userId);
        console.log('[CHAT_PAGE] ✅ Updated online users after adding:', Array.from(newSet));
        return newSet;
      });
    };

    const handleUserOffline = (data) => {
      console.log('[CHAT_PAGE] 🔴 User went offline:', data);
      setOnlineUsers(prev => {
        console.log('[CHAT_PAGE] 🔍 Current onlineUsers before update:', Array.from(prev));
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        console.log('[CHAT_PAGE] ✅ Updated online users after removing:', Array.from(newSet));
        return newSet;
      });
    };

    const handleConnectionSuccess = async (data) => {
      console.log('[CHAT_PAGE] 🔗 Socket connection successful:', data);
      // Fetch initial online users when socket connects
      await fetchInitialOnlineUsers();
    };

    // Add listeners
    enhancedSocketService.on('user_online', handleUserOnline);
    enhancedSocketService.on('user_offline', handleUserOffline);
    enhancedSocketService.on('connection_success', handleConnectionSuccess);
    
    // Call event listeners
    enhancedSocketService.on('call_incoming', handleIncomingCall);
    enhancedSocketService.on('call_accepted', handleCallAccepted);
    enhancedSocketService.on('call_rejected', handleCallRejected);
    enhancedSocketService.on('call_ended', handleCallEnded);
    enhancedSocketService.on('call_error', handleCallError);

    // Mark listeners as set up
    listenersSetupRef.current = true;

    // If socket is already connected, fetch online users immediately
    if (enhancedSocketService.isConnected) {
      fetchInitialOnlineUsers();
    }

    return () => {
      enhancedSocketService.off('user_online', handleUserOnline);
      enhancedSocketService.off('user_offline', handleUserOffline);
      enhancedSocketService.off('connection_success', handleConnectionSuccess);
      
      // Remove call event listeners
      enhancedSocketService.off('call_incoming', handleIncomingCall);
      enhancedSocketService.off('call_accepted', handleCallAccepted);
      enhancedSocketService.off('call_rejected', handleCallRejected);
      enhancedSocketService.off('call_ended', handleCallEnded);
      enhancedSocketService.off('call_error', handleCallError);
      
      listenersSetupRef.current = false;
    };
  }, [user]);

  const loadChatDetails = async (chatIdParam) => {
    try {
      setLoading(true);
      setError(null);
      console.log('[CHAT_PAGE] Loading chat details for:', chatIdParam);
      
      const result = await chatService.getChatDetails(chatIdParam);
      
      if (result.success) {
        setSelectedChat(result.chat);
        console.log('[CHAT_PAGE] Chat details loaded successfully:', result.chat);
        console.log('[CHAT_PAGE] Other participant ID:', result.chat.otherParticipant?._id);
        console.log('[CHAT_PAGE] Other participant username:', result.chat.otherParticipant?.username);
      }
    } catch (err) {
      console.error('Error loading chat details:', err);
      setError(err.message || 'Failed to load chat details');
    } finally {
      setLoading(false);
    }
  };

  const checkForActiveCall = async (chatIdParam) => {
    try {
      const result = await callService.getActiveCall(chatIdParam);
      
      if (result.success && result.activeCall) {
        setActiveCall(result.activeCall);
      }
    } catch (error) {
      console.error('Error checking for active call:', error);
    }
  };

  const handleChatSelect = useCallback((chat) => {
    setSelectedChat(chat);
    setError(null);
    
    // Update URL without page reload
    const newUrl = chat ? `/chat/${chat._id}` : '/chat';
    window.history.pushState({}, '', newUrl);
  }, []);

  const handleCallInitiate = useCallback(async (chat, type) => {
    try {
      if (activeCall) {
        throw new Error('Another call is already active');
      }

      const result = await callService.initiateCall(chat._id, type);
      
      if (result.success) {
        setActiveCall({
          callId: result.callId,
          chatId: result.chatId,
          type: result.type,
          status: result.status,
          otherUser: result.otherParticipant,
          isIncoming: false
        });
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      setError(error.message || 'Failed to initiate call');
    }
  }, [activeCall]);

  const handleCallEnd = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
  }, []);

  const handleIncomingCall = useCallback((callData) => {
    console.log('[CHAT_PAGE] 📞 Incoming call received:', callData);
    
    // Check if this is the same call that's already active
    if (activeCall && activeCall.callId === callData.callId) {
      console.log('[CHAT_PAGE] 📞 Call already active, updating status to connected');
      setActiveCall(prev => ({
        ...prev,
        status: 'connected'
      }));
      return;
    }
    
    setIncomingCall(callData);
  }, [activeCall]);

  const handleCallAccepted = useCallback((callData) => {
    console.log('[CHAT_PAGE] 📞 Call accepted:', callData);
    
    // Clear incoming call since it's now accepted
    setIncomingCall(null);
    
    // Update active call status to connected using functional updates
    setActiveCall(prev => {
      console.log('[CHAT_PAGE] 🔍 Current activeCall before update:', prev);
      
      if (prev && prev.callId === callData.callId) {
        console.log('[CHAT_PAGE] 🔄 Updating existing activeCall status to connected');
        const updated = { ...prev, status: 'connected' };
        console.log('[CHAT_PAGE] 🔄 Updated activeCall:', updated);
        return updated;
      } else {
        // If no active call exists, create one with connected status
        console.log('[CHAT_PAGE] 🆕 Creating new activeCall with connected status');
        const newActiveCall = {
          callId: callData.callId,
          status: 'connected',
          type: callData.type || 'audio',
          timestamp: callData.timestamp,
          chatId: callData.chatId,
          otherUser: callData.otherUser,
          isIncoming: false
        };
        console.log('[CHAT_PAGE] 🆕 New activeCall:', newActiveCall);
        return newActiveCall;
      }
    });
    
    // Clear any errors
    setError(null);
  }, []); // Remove dependencies to prevent recreation

  const handleCallRejected = useCallback((callData) => {
    console.log('[CHAT_PAGE] 📞 Call rejected:', callData);
    setIncomingCall(null);
    setActiveCall(null);
    setError('Call was rejected');
  }, []);

  const handleCallEnded = useCallback((callData) => {
    console.log('[CHAT_PAGE] 📞 Call ended:', callData);
    setIncomingCall(null);
    setActiveCall(null);
  }, []);

  const handleCallError = useCallback((errorData) => {
    console.error('[CHAT_PAGE] 📞 Call error:', errorData);
    setIncomingCall(null);
    setActiveCall(null);
    setError(errorData.message || 'Call error occurred');
  }, []);

  const handleAcceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      // Check if there's already an active call with the same ID
      if (activeCall && activeCall.callId === incomingCall.callId) {
        console.log('[CHAT_PAGE] 📞 Call already active, updating status to connected');
        setActiveCall(prev => ({
          ...prev,
          status: 'connected'
        }));
        setIncomingCall(null);
        return;
      }

      const result = await callService.acceptCall(incomingCall.callId);
      
      if (result.success) {
        setActiveCall({
          callId: incomingCall.callId,
          chatId: incomingCall.chatId,
          type: incomingCall.type,
          status: 'connected',
          otherUser: incomingCall.otherUser,
          isIncoming: false
        });
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Error accepting incoming call:', error);
      
      // If the error is about call not being in ringing state, it might already be connected
      if (error.message && error.message.includes('not in ringing state')) {
        console.log('[CHAT_PAGE] 📞 Call already connected, updating active call status');
        setActiveCall({
          callId: incomingCall.callId,
          chatId: incomingCall.chatId,
          type: incomingCall.type,
          status: 'connected',
          otherUser: incomingCall.otherUser,
          isIncoming: false
        });
        setIncomingCall(null);
      } else {
        setError(error.message || 'Failed to accept call');
        setIncomingCall(null);
      }
    }
  }, [incomingCall, activeCall]);

  const handleRejectIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      await callService.rejectCall(incomingCall.callId, 'User rejected');
      setIncomingCall(null);
    } catch (error) {
      console.error('Error rejecting incoming call:', error);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // Responsive layout
  const isMobile = window.innerWidth < 768;

  if (loading && !selectedChat) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !selectedChat) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      {/* Enhanced Chat List */}
      <div className={`${isMobile ? (showChatList ? 'w-full' : 'hidden') : 'w-1/3'} border-r border-gray-200/50 dark:border-gray-700/50 shadow-large`}>
        <EnhancedChatList
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChat?._id}
          onCallInitiate={handleCallInitiate}
          onlineUsers={onlineUsers}
          onOnlineUsersUpdate={handleOnlineUsersUpdate}
          className="h-full"
        />
      </div>

      {/* Enhanced Chat Messages */}
      <div className={`${isMobile ? (showChatList ? 'hidden' : 'w-full') : 'flex-1'} flex flex-col relative`}>
        {selectedChat ? (
          <>
            {/* Enhanced Chat Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-soft">
              <div className="flex items-center space-x-4">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setShowChatList(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                  >
                    ←
                  </Button>
                )}
                <div className="relative">
                  <img
                    src={selectedChat.otherParticipant?.profilePictureUrl || '/default-avatar.png'}
                    alt={selectedChat.otherParticipant?.fullName || 'User'}
                    className="avatar-lg ring-2 ring-white dark:ring-gray-900 shadow-soft"
                  />
                  {(() => {
                    const userId = selectedChat.otherParticipant?._id;
                    const isOnline = onlineUsers.has(userId);
                    console.log('[CHAT_PAGE] Checking online status:', { 
                      userId, 
                      username: selectedChat.otherParticipant?.username,
                      isOnline, 
                      onlineUsers: Array.from(onlineUsers) 
                    });
                    return isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse"></div>
                    );
                  })()}
                </div>
                <div>
                  <h2 className="heading-4 text-gray-900 dark:text-white">
                    {selectedChat.otherParticipant?.fullName || selectedChat.otherParticipant?.username}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      onlineUsers.has(selectedChat.otherParticipant?._id) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <p className="text-sm text-muted font-medium">
                      {onlineUsers.has(selectedChat.otherParticipant?._id) ? 'Online' : 'Last seen recently'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => handleCallInitiate(selectedChat, 'audio')}
                  disabled={!!activeCall}
                  className="p-3 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl group"
                >
                  <Phone className="w-5 h-5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => handleCallInitiate(selectedChat, 'video')}
                  disabled={!!activeCall}
                  className="p-3 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-xl group"
                >
                  <Video className="w-5 h-5 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Button>
              </div>
            </div>

            {/* Enhanced Messages */}
            <div className="flex-1 overflow-hidden">
              <EnhancedMessageList
                chatId={selectedChat._id}
                onCallInitiate={handleCallInitiate}
                className="h-full"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-3xl flex items-center justify-center">
                <MessageCircle className="w-12 h-12 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="heading-3 text-gray-900 dark:text-white mb-3">
                Start a Conversation
              </h2>
              <p className="text-muted mb-6 leading-relaxed">
                Choose a conversation from the list to begin chatting, or start a new conversation with someone.
              </p>
              <Button
                variant="primary"
                size="medium"
                className="shadow-soft hover:shadow-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Active Call Overlay */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-black">
          {activeCall.type === 'audio' ? (
            <EnhancedAudioCall
              chatId={activeCall.chatId}
              otherUser={activeCall.otherUser}
              callId={activeCall.callId}
              isIncoming={activeCall.isIncoming}
              status={activeCall.status}
              onCallEnd={handleCallEnd}
            />
          ) : (
            <EnhancedVideoCall
              chatId={activeCall.chatId}
              otherUser={activeCall.otherUser}
              callId={activeCall.callId}
              isIncoming={activeCall.isIncoming}
              status={activeCall.status}
              onCallEnd={handleCallEnd}
            />
          )}
        </div>
      )}

      {/* Enhanced Incoming Call Notification */}
      {incomingCall && !activeCall && incomingCall.callId !== activeCall?.callId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-3xl p-8 max-w-md w-full shadow-large border border-gray-200/50 dark:border-gray-700/50 animate-bounce-in">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden ring-4 ring-primary-200/50 dark:ring-primary-800/50 shadow-soft">
                  <img
                    src={incomingCall.otherUser?.profilePictureUrl || '/default-avatar.png'}
                    alt={incomingCall.otherUser?.fullName || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-primary-400/30 animate-ping"></div>
              </div>
              
              <div className="mb-6">
                <h3 className="heading-4 text-gray-900 dark:text-white mb-2">
                  {incomingCall.type === 'audio' ? '📞 Incoming Audio Call' : '📹 Incoming Video Call'}
                </h3>
                
                <p className="text-muted text-lg">
                  {incomingCall.otherUser?.fullName || incomingCall.otherUser?.username}
                </p>
                <p className="text-sm text-subtle mt-1">
                  is calling you
                </p>
              </div>
              
              <div className="flex space-x-4 justify-center">
                <Button
                  variant="danger"
                  size="large"
                  onClick={handleRejectIncomingCall}
                  className="px-8 py-3 shadow-soft hover:shadow-medium"
                >
                  <PhoneOff className="w-5 h-5 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="success"
                  size="large"
                  onClick={handleAcceptIncomingCall}
                  className="px-8 py-3 shadow-soft hover:shadow-medium"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-40 bg-red-50/95 dark:bg-red-900/20 backdrop-blur-md border border-red-200 dark:border-red-800 rounded-2xl p-4 max-w-md shadow-large animate-slide-in">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 text-sm font-bold">!</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedChatPage;
