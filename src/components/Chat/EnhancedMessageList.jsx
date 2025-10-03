import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Image, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Reply,
  Forward,
  Edit,
  Trash2,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Frown
} from 'lucide-react';
import messageService from '../../services/enhancedMessageService';
import enhancedSocketService from '../../services/enhancedSocketService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';

/**
 * Enhanced Message List Component with comprehensive features
 */
const EnhancedMessageList = ({ 
  chatId, 
  onCallInitiate,
  className = '' 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  
  // Debug: Log user object and context
  console.log('[MESSAGE_LIST] 🔍 User from useAuth:', user);
  console.log('[MESSAGE_LIST] 🔍 User type:', typeof user);
  console.log('[MESSAGE_LIST] 🔍 User keys:', user ? Object.keys(user) : 'user is null/undefined');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set()); // Set of typing user objects
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Load messages when chatId changes
  useEffect(() => {
    if (chatId) {
      loadMessages();
      markAsRead();
      
      // Join chat room for real-time events
      console.log('[MESSAGE_LIST] 🔌 Joining chat room:', chatId);
      enhancedSocketService.joinChat(chatId);
      
      // Cleanup: Leave chat room when component unmounts or chatId changes
      return () => {
        console.log('[MESSAGE_LIST] 🔌 Leaving chat room:', chatId);
        enhancedSocketService.leaveChat(chatId);
      };
    } else {
      setMessages([]);
    }
  }, [chatId]);

  // Setup socket listeners for real-time messages
  useEffect(() => {
    if (!chatId) return;

    console.log('[MESSAGE_LIST] 🔌 Setting up socket listeners for real-time messages');
    
    const handleMessageReceived = (data) => {
      console.log('[MESSAGE_LIST] 📨 Message received:', data);
      console.log('[MESSAGE_LIST] 🔍 Current editingMessage state:', editingMessage);
      
      // Only add message if it's for the current chat
      if (data.chatId === chatId) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates (check both _id and messageId)
          const messageExists = prev.some(msg => 
            (msg._id && data._id && msg._id === data._id) || 
            (msg.messageId && data.messageId && msg.messageId === data.messageId)
          );
          if (messageExists) {
            console.log('[MESSAGE_LIST] ⚠️ Message already exists, skipping');
            return prev;
          }
          
          // Debug: Check message structure
          if (!data._id && !data.messageId) {
            console.error('[MESSAGE_LIST] ❌ Received message without _id or messageId:', data);
          }
          
          // Debug: Check senderId structure
          if (!data.senderId || !data.senderId._id) {
            console.error('[MESSAGE_LIST] ❌ Received message without proper senderId:', data);
          }
          
          console.log('[MESSAGE_LIST] ✅ Adding new message to list');
          return [...prev, data];
        });
        
        // Clear any editing state when receiving new messages
        if (editingMessage) {
          console.log('[MESSAGE_LIST] 🔍 Clearing editing state due to new message received');
          setEditingMessage(null);
        }
        
        // Auto-scroll to bottom for new messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    const handleMessageUpdated = (data) => {
      console.log('[MESSAGE_LIST] ✏️ Message updated:', data);
      
      if (data.chatId === chatId) {
        setMessages(prev => prev.map(msg => {
          // Check both _id and messageId for matching
          const isMatch = (msg._id && data._id && msg._id === data._id) || 
                         (msg.messageId && data.messageId && msg.messageId === data.messageId) ||
                         (msg._id && data.messageId && msg._id === data.messageId) ||
                         (msg.messageId && data._id && msg.messageId === data._id);
          return isMatch ? { ...msg, ...data } : msg;
        }));
      }
    };

    const handleMessageDeleted = (data) => {
      console.log('[MESSAGE_LIST] 🗑️ Message deleted:', data);
      
      if (data.chatId === chatId) {
        setMessages(prev => prev.filter(msg => {
          // Check both _id and messageId for matching
          return !((msg._id && data.messageId && msg._id === data.messageId) ||
                   (msg.messageId && data.messageId && msg.messageId === data.messageId) ||
                   (msg._id && data._id && msg._id === data._id) ||
                   (msg.messageId && data._id && msg.messageId === data._id));
        }));
      }
    };

    const handleUserTyping = (data) => {
      console.log('[MESSAGE_LIST] ⌨️ User typing event received:', data);
      console.log('[MESSAGE_LIST] ⌨️ Current chatId:', chatId);
      console.log('[MESSAGE_LIST] ⌨️ Event chatId matches current chatId:', data.chatId === chatId);
      
      if (data.chatId === chatId) {
        console.log('[MESSAGE_LIST] ⌨️ Processing typing event for current chat');
        setTypingUsers(prev => {
          const newTypingUsers = new Set(prev);
          console.log('[MESSAGE_LIST] ⌨️ Current typing users:', Array.from(prev));
          
          if (data.isTyping) {
            // Add user to typing list
            const typingUser = {
              userId: data.userId,
              username: data.username,
              fullName: data.fullName
            };
            newTypingUsers.add(typingUser);
            console.log('[MESSAGE_LIST] ⌨️ Added user to typing list:', typingUser);
          } else {
            // Remove user from typing list
            const userToRemove = Array.from(newTypingUsers).find(
              user => user.userId === data.userId
            );
            if (userToRemove) {
              newTypingUsers.delete(userToRemove);
              console.log('[MESSAGE_LIST] ⌨️ Removed user from typing list:', userToRemove);
            }
          }
          
          console.log('[MESSAGE_LIST] ⌨️ Updated typing users:', Array.from(newTypingUsers));
          return newTypingUsers;
        });
      } else {
        console.log('[MESSAGE_LIST] ⌨️ Ignoring typing event for different chat');
      }
    };

    // Add listeners
    enhancedSocketService.on('message_received', handleMessageReceived);
    enhancedSocketService.on('message_updated', handleMessageUpdated);
    enhancedSocketService.on('message_deleted', handleMessageDeleted);
    enhancedSocketService.on('user_typing', handleUserTyping);

    return () => {
      // Cleanup listeners
      enhancedSocketService.off('message_received', handleMessageReceived);
      enhancedSocketService.off('message_updated', handleMessageUpdated);
      enhancedSocketService.off('message_deleted', handleMessageDeleted);
      enhancedSocketService.off('user_typing', handleUserTyping);
    };
  }, [chatId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await messageService.getChatMessages(chatId, 1, 50);
      
      if (result.success) {
        // Debug: Check for messages without IDs
        const messagesWithoutIds = result.messages.filter(msg => !msg._id && !msg.messageId);
        if (messagesWithoutIds.length > 0) {
          console.error('[MESSAGE_LIST] ❌ Found messages without _id or messageId:', messagesWithoutIds);
        }
        
        // Debug: Check for duplicate IDs (check both _id and messageId)
        const ids = result.messages.map(msg => msg._id || msg.messageId);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('[MESSAGE_LIST] ⚠️ Found duplicate message IDs:', duplicateIds);
        }
        
        // Remove duplicates based on message ID using a Set for better performance
        const seenIds = new Set();
        const uniqueMessages = result.messages.filter((message) => {
          const messageId = message._id || message.messageId;
          if (seenIds.has(messageId)) {
            console.warn('[MESSAGE_LIST] ⚠️ Filtering out duplicate message:', messageId);
            return false;
          }
          seenIds.add(messageId);
          return true;
        });
        
        setMessages(uniqueMessages);
        console.log('[MESSAGE_LIST] 📋 Messages loaded:', uniqueMessages.length, 'unique messages from', result.messages.length, 'total');
        
        // Debug: Check for any remaining duplicates
        const finalIds = uniqueMessages.map(msg => msg._id || msg.messageId);
        const finalDuplicates = finalIds.filter((id, index) => finalIds.indexOf(id) !== index);
        if (finalDuplicates.length > 0) {
          console.error('[MESSAGE_LIST] ❌ Still found duplicate message IDs after filtering:', finalDuplicates);
        }
        
        // Debug: Log all message IDs to see the structure
        console.log('[MESSAGE_LIST] 🔍 All message IDs:', finalIds);
        
        // Debug: Store the initial message count for comparison
        console.log('[MESSAGE_LIST] 🔍 Initial message count set to:', uniqueMessages.length);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await messageService.markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !replyingTo) return;
    
    try {
      // Stop typing when sending message
      handleStopTyping();
      
      const result = await messageService.sendMessage(
        chatId,
        newMessage.trim(),
        'text',
        replyingTo?._id
      );
      
      if (result.success) {
        console.log('[MESSAGE_LIST] 🔍 Clearing editing state before sending message');
        setNewMessage('');
        setReplyingTo(null);
        setEditingMessage(null); // Clear any editing state when sending new message
        // Add new message to local state
        setMessages(prev => [...prev, result.message]);
        console.log('[MESSAGE_LIST] ✅ Message sent successfully, editing state cleared');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
    }
  };

  const handleStartTyping = () => {
    console.log('[MESSAGE_LIST] ⌨️ handleStartTyping called:', { isTyping, chatId });
    if (!isTyping && chatId) {
      setIsTyping(true);
      enhancedSocketService.startTyping(chatId);
      console.log('[MESSAGE_LIST] ⌨️ Started typing in chat:', chatId);
    } else {
      console.log('[MESSAGE_LIST] ⌨️ Not starting typing:', { isTyping, chatId });
    }
  };

  const handleStopTyping = () => {
    console.log('[MESSAGE_LIST] ⌨️ handleStopTyping called:', { isTyping, chatId });
    if (isTyping && chatId) {
      setIsTyping(false);
      enhancedSocketService.stopTyping(chatId);
      console.log('[MESSAGE_LIST] ⌨️ Stopped typing in chat:', chatId);
    } else {
      console.log('[MESSAGE_LIST] ⌨️ Not stopping typing:', { isTyping, chatId });
    }
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleTypingTimeout = () => {
    // Set a timeout to stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleMessageInputChange = (e) => {
    const value = e.target.value;
    console.log('[MESSAGE_LIST] ⌨️ Input changed:', { value: value.substring(0, 20) + '...', chatId });
    setNewMessage(value);
    
    if (value.trim()) {
      console.log('[MESSAGE_LIST] ⌨️ Input has content, starting typing');
      handleStartTyping();
      handleTypingTimeout();
    } else {
      console.log('[MESSAGE_LIST] ⌨️ Input is empty, stopping typing');
      handleStopTyping();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Determine message type based on file type
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    
    try {
      setUploadProgress(0);
      
      const result = await messageService.sendFileMessage(
        chatId,
        file,
        type,
        (progress) => setUploadProgress(progress)
      );
      
      if (result.success) {
        setMessages(prev => [...prev, result.message]);
        setUploadProgress(null);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message || 'Failed to upload file');
      setUploadProgress(null);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const result = await messageService.editMessage(messageId, newContent);
      
      if (result.success) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId 
              ? { ...msg, content: result.content, editedAt: result.editedAt }
              : msg
          )
        );
        setEditingMessage(null);
      }
    } catch (error) {
      console.error('Error editing message:', error);
      setError(error.message || 'Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const result = await messageService.deleteMessage(messageId);
      
      if (result.success) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        setContextMenu(null);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      setError(error.message || 'Failed to delete message');
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      const result = await messageService.reactToMessage(messageId, emoji);
      
      if (result.success) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId 
              ? { ...msg, reactions: result.reactions }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error reacting to message:', error);
    }
  };

  const handleForwardMessage = async (targetChatId) => {
    if (!contextMenu?.message) return;
    
    try {
      const result = await messageService.forwardMessage(
        contextMenu.message._id,
        targetChatId
      );
      
      if (result.success) {
        setContextMenu(null);
      }
    } catch (error) {
      console.error('Error forwarding message:', error);
      setError(error.message || 'Failed to forward message');
    }
  };

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      message,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (message) => {
    // Debug: Check if user and message.senderId exist
    if (!user || !message.senderId) {
      console.error('[MESSAGE_LIST] ❌ Missing user or senderId:', { user, senderId: message.senderId });
      return false;
    }
    
    // Handle different user ID structures
    const currentUserId = user._id || user.userId || user.id;
    const senderId = message.senderId._id || message.senderId.userId || message.senderId.id;
    
    const isOwn = senderId === currentUserId;
    
    // Only log for first few messages to reduce spam
    if (message._id && message._id.includes('68dd327f7877c52cbf958d82')) {
      console.log('[MESSAGE_LIST] 🔍 Checking message ownership:', {
        messageId: message._id || message.messageId,
        senderId: senderId,
        currentUserId: currentUserId,
        isOwn: isOwn,
        userStructure: { _id: user._id, userId: user.userId, id: user.id },
        senderStructure: { _id: message.senderId._id, userId: message.senderId.userId, id: message.senderId.id }
      });
    }
    return isOwn;
  };

  const getReactionCount = (reactions, emoji) => {
    return reactions?.filter(r => r.emoji === emoji).length || 0;
  };

  const commonEmojis = ['❤️', '👍', '😂', '😢', '😡'];

  const getTypingIndicator = () => {
    console.log('[MESSAGE_LIST] ⌨️ getTypingIndicator called, typingUsers.size:', typingUsers.size);
    console.log('[MESSAGE_LIST] ⌨️ typingUsers:', Array.from(typingUsers));
    
    if (typingUsers.size === 0) {
      console.log('[MESSAGE_LIST] ⌨️ No typing users, returning null');
      return null;
    }

    const typingUsersArray = Array.from(typingUsers);
    
    if (typingUsersArray.length === 1) {
      const user = typingUsersArray[0];
      const indicator = `${user.fullName || user.username} is typing...`;
      console.log('[MESSAGE_LIST] ⌨️ Single user typing indicator:', indicator);
      return indicator;
    } else if (typingUsersArray.length === 2) {
      const [user1, user2] = typingUsersArray;
      const indicator = `${user1.fullName || user1.username} and ${user2.fullName || user2.username} are typing...`;
      console.log('[MESSAGE_LIST] ⌨️ Two users typing indicator:', indicator);
      return indicator;
    } else {
      const indicator = `${typingUsersArray.length} people are typing...`;
      console.log('[MESSAGE_LIST] ⌨️ Multiple users typing indicator:', indicator);
      return indicator;
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Debug: Log messages array structure during rendering
  if (messages.length > 0) {
    console.log('[MESSAGE_LIST] 🔍 Rendering messages array:', {
      totalMessages: messages.length,
      messageIds: messages.map((msg, i) => ({ index: i, _id: msg._id, messageId: msg.messageId })),
      editingMessage: editingMessage
    });
  }

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-soft animate-slide-in">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-sm font-bold">!</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setError(null)}
                  className="mt-2 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          // Debug: Check for missing or duplicate IDs
          if (!message._id && !message.messageId) {
            console.warn(`[MESSAGE_LIST] Message at index ${index} missing both _id and messageId:`, message);
          }
          
          // Use messageId as fallback if _id is not available
          const messageKey = message._id || message.messageId || `message-${index}`;
          
          // Check for duplicate IDs (only log for first few messages to reduce spam)
          if (index < 3) {
            const duplicateIndex = messages.findIndex((msg, i) => {
              if (i === index) return false; // Skip self
              const msgId = msg._id || msg.messageId;
              const currentMsgId = message._id || message.messageId;
              return msgId === currentMsgId;
            });
            if (duplicateIndex !== -1) {
              console.warn(`[MESSAGE_LIST] 🔍 Duplicate detection details:`, {
                currentIndex: index,
                duplicateIndex: duplicateIndex,
                messageId: messageKey,
                currentMessage: { _id: message._id, messageId: message.messageId },
                duplicateMessage: { _id: messages[duplicateIndex]._id, messageId: messages[duplicateIndex].messageId },
                totalMessages: messages.length
              });
            }
          }
          
          // Calculate if this is the current user's message once
          const isOwn = isOwnMessage(message);
          
          // Debug: Log message structure for first few messages only
          if (index < 2) {
            console.log('[MESSAGE_LIST] 🔍 Message structure:', {
              index,
              messageId: message._id || message.messageId,
              senderId: message.senderId,
              currentUserId: user?._id || user?.userId || user?.id,
              isOwn,
              messageContent: message.content?.substring(0, 30) + '...'
            });
          }
          
          return (
            <div
              key={messageKey}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group animate-slide-in`}
            onContextMenu={(e) => handleContextMenu(e, message)}
          >
            <div className={`max-w-xs lg:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
              {/* Enhanced Reply indicator */}
              {message.replyTo && (
                <div className="mb-3 p-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border-l-4 border-primary-500 shadow-soft">
                  <p className="text-xs text-muted font-medium mb-1">
                    Replying to {message.replyTo.senderId.username}
                  </p>
                  <p className="text-sm text-subtle truncate-2">
                    {message.replyTo.content}
                  </p>
                </div>
              )}

              <div
                className={`relative p-4 rounded-2xl shadow-soft transition-all duration-200 hover:shadow-medium group-hover:scale-[1.02] ${
                  isOwn
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                    : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-700/50'
                }`}
              >
                {/* Message content */}
                {(() => {
                  const isEditing = editingMessage && editingMessage._id && message._id && editingMessage._id === message._id;
                  if (isEditing) {
                    console.log('[MESSAGE_LIST] 🔍 Rendering message in edit mode:', {
                      messageId: message._id || message.messageId,
                      editingMessageId: editingMessage?._id,
                      isEditing: true
                    });
                  }
                  return isEditing;
                })() ? (
                  <div className="space-y-2">
                    <textarea
                      defaultValue={message.content}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      rows="2"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => setEditingMessage(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          const newContent = e.target.previousElementSibling.value;
                          handleEditMessage(message._id, newContent);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{message.content}</p>
                    
                    {/* Message media */}
                    {message.media?.url && (
                      <div className="mt-2">
                        {message.type === 'image' && (
                          <img
                            src={message.media.url}
                            alt="Message attachment"
                            className="max-w-full h-auto rounded"
                          />
                        )}
                        {message.type === 'video' && (
                          <video
                            src={message.media.url}
                            controls
                            className="max-w-full h-auto rounded"
                          />
                        )}
                        {message.type === 'audio' && (
                          <audio
                            src={message.media.url}
                            controls
                            className="w-full"
                          />
                        )}
                        {message.type === 'document' && (
                          <div className="flex items-center space-x-2 p-2 bg-gray-200 dark:bg-gray-700 rounded">
                            <Paperclip className="w-4 h-4" />
                            <span className="text-sm">{message.media.fileName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Message metadata */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-1">
                    {message.editedAt && (
                      <span className="text-xs opacity-75">(edited)</span>
                    )}
                    <span className="text-xs opacity-75">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                  
                  {/* Message status */}
                  {isOwn && (
                    <div className="flex items-center">
                      {message.status === 'sent' && (
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      )}
                      {message.status === 'delivered' && (
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                      )}
                      {message.status === 'read' && (
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.reactions.map((reaction, index) => (
                      <span
                        key={`${message._id}-reaction-${reaction.emoji}-${index}`}
                        className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded-full border"
                      >
                        {reaction.emoji} {reaction.count || 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick reactions */}
              <div className="flex space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    className="text-lg hover:scale-125 transition-transform"
                    onClick={() => handleReactToMessage(message._id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          );
        })}
        
        {/* Typing Indicator */}
        {getTypingIndicator() && (
          <div className="flex justify-start">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl px-4 py-2 shadow-soft animate-pulse">
              <p className="text-sm text-primary-600 dark:text-primary-400 italic">
                {getTypingIndicator()}
              </p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-blue-600 dark:text-blue-400">
              Uploading... {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mt-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Replying to {replyingTo.senderId.username}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {replyingTo.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleMessageInputChange}
              placeholder="Type a message..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="p-2"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2"
            >
              <Smile className="w-5 h-5" />
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newMessage.trim()}
              className="p-2"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          className="hidden"
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[160px]"
          style={{
            left: contextMenu.position.x,
            top: contextMenu.position.y,
          }}
          onClick={closeContextMenu}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setReplyingTo(contextMenu.message)}
          >
            <Reply className="w-4 h-4 inline mr-2" />
            Reply
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setEditingMessage(contextMenu.message)}
          >
            <Edit className="w-4 h-4 inline mr-2" />
            Edit
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleForwardMessage(contextMenu.message)}
          >
            <Forward className="w-4 h-4 inline mr-2" />
            Forward
          </button>
          <hr className="my-2 border-gray-200 dark:border-gray-700" />
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => handleDeleteMessage(contextMenu.message._id)}
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            Delete
          </button>
        </div>
      )}
      
      {/* Backdrop for context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </div>
  );
};

export default EnhancedMessageList;
