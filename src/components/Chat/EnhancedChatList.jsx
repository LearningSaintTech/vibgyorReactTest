import React, { useState, useEffect, useCallback } from 'react';
import { Search, MessageCircle, Phone, Video, MoreVertical, Archive, Pin, Volume2, VolumeX, Filter, Settings, Plus } from 'lucide-react';
import chatService from '../../services/enhancedChatService';
import enhancedSocketService from '../../services/enhancedSocketService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';

/**
 * Enhanced Chat List Component with comprehensive features
 */
const EnhancedChatList = ({ 
  onChatSelect, 
  selectedChatId, 
  onCallInitiate,
  onlineUsers = new Set(),
  className = '' 
}) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map()); // chatId -> Set of typing user objects

  // Load initial chats
  useEffect(() => {
    loadChats();
  }, []);

  // Join all chat rooms for real-time events
  useEffect(() => {
    if (chats.length > 0) {
      console.log('[CHAT_LIST] 🔌 Joining chat rooms for typing events:', chats.map(c => c._id));
      chats.forEach(chat => {
        enhancedSocketService.joinChat(chat._id);
      });
      
      // Cleanup: Leave all chat rooms when component unmounts
      return () => {
        console.log('[CHAT_LIST] 🔌 Leaving chat rooms:', chats.map(c => c._id));
        chats.forEach(chat => {
          enhancedSocketService.leaveChat(chat._id);
        });
      };
    }
  }, [chats]);

  // Filter chats based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => {
        const otherUser = chat.otherParticipant;
        if (!otherUser) return false;
        
        return (
          otherUser.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          otherUser.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredChats(filtered);
    }
  }, [chats, searchQuery]);

  // Setup socket listeners for real-time chat updates
  useEffect(() => {
    console.log('[CHAT_LIST] 🔌 Setting up socket listeners for real-time chat updates');
    
    const handleMessageReceived = (data) => {
      console.log('[CHAT_LIST] 📨 Message received, updating chat list:', data);
      
      // Update the chat list to show the new message
      setChats(prev => prev.map(chat => {
        if (chat._id === data.chatId) {
          return {
            ...chat,
            lastMessage: data,
            lastMessageAt: data.createdAt || new Date(),
            unreadCount: data.senderId !== user?.userId ? (chat.unreadCount || 0) + 1 : chat.unreadCount
          };
        }
        return chat;
      }));
    };

    const handleMessageUpdated = (data) => {
      console.log('[CHAT_LIST] ✏️ Message updated, updating chat list:', data);
      
      setChats(prev => prev.map(chat => {
        if (chat._id === data.chatId) {
          return {
            ...chat,
            lastMessage: data,
            lastMessageAt: data.updatedAt || new Date()
          };
        }
        return chat;
      }));
    };

    const handleMessageDeleted = (data) => {
      console.log('[CHAT_LIST] 🗑️ Message deleted, updating chat list:', data);
      
      setChats(prev => prev.map(chat => {
        if (chat._id === data.chatId) {
          // If the deleted message was the last message, we might need to reload the chat
          // For now, just update the timestamp
          return {
            ...chat,
            lastMessageAt: new Date()
          };
        }
        return chat;
      }));
    };

    const handleUserTyping = (data) => {
      console.log('[CHAT_LIST] ⌨️ User typing event received:', data);
      console.log('[CHAT_LIST] ⌨️ Current typingUsers state:', typingUsers);
      
      setTypingUsers(prev => {
        const newTypingUsers = new Map(prev);
        const chatId = data.chatId;
        
        console.log('[CHAT_LIST] ⌨️ Processing typing event for chat:', chatId);
        
        if (!newTypingUsers.has(chatId)) {
          newTypingUsers.set(chatId, new Set());
          console.log('[CHAT_LIST] ⌨️ Created new typing set for chat:', chatId);
        }
        
        const chatTypingUsers = newTypingUsers.get(chatId);
        
        if (data.isTyping) {
          // Add user to typing list
          const typingUser = {
            userId: data.userId,
            username: data.username,
            fullName: data.fullName
          };
          chatTypingUsers.add(typingUser);
          console.log('[CHAT_LIST] ⌨️ Added user to typing list:', typingUser);
        } else {
          // Remove user from typing list
          const userToRemove = Array.from(chatTypingUsers).find(
            user => user.userId === data.userId
          );
          if (userToRemove) {
            chatTypingUsers.delete(userToRemove);
            console.log('[CHAT_LIST] ⌨️ Removed user from typing list:', userToRemove);
          }
        }
        
        // Clean up empty sets
        if (chatTypingUsers.size === 0) {
          newTypingUsers.delete(chatId);
          console.log('[CHAT_LIST] ⌨️ Removed empty typing set for chat:', chatId);
        }
        
        console.log('[CHAT_LIST] ⌨️ Updated typingUsers:', newTypingUsers);
        return newTypingUsers;
      });
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
  }, [user?.userId]);

  const loadChats = async (pageNum = 1, append = false) => {
    try {
      setError(null);
      
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const result = await chatService.getUserChats(pageNum, 20);
      
      if (result.success) {
        if (append) {
          setChats(prev => [...prev, ...result.chats]);
        } else {
          setChats(result.chats);
        }
        
        setHasMore(result.pagination.hasMore);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Error loading chats:', err);
      setError(err.message || 'Failed to load chats');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreChats = () => {
    if (!loadingMore && hasMore) {
      loadChats(page + 1, true);
    }
  };

  const handleChatClick = (chat) => {
    if (onChatSelect) {
      onChatSelect(chat);
    }
  };

  const handleCallClick = async (chat, type) => {
    if (onCallInitiate) {
      try {
        await onCallInitiate(chat, type);
      } catch (error) {
        console.error('Error initiating call:', error);
      }
    }
  };

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      chat,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleChatAction = async (action, chat) => {
    try {
      let result;
      
      switch (action) {
        case 'archive':
          result = await chatService.archiveChat(chat._id);
          break;
        case 'unarchive':
          result = await chatService.unarchiveChat(chat._id);
          break;
        case 'pin':
          result = await chatService.pinChat(chat._id);
          break;
        case 'unpin':
          result = await chatService.unpinChat(chat._id);
          break;
        case 'mute':
          result = await chatService.muteChat(chat._id);
          break;
        case 'unmute':
          result = await chatService.unmuteChat(chat._id);
          break;
        case 'delete':
          result = await chatService.deleteChat(chat._id);
          break;
        default:
          return;
      }
      
      if (result.success) {
        // Update local state
        setChats(prev => prev.filter(c => c._id !== chat._id));
        closeContextMenu();
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getLastMessagePreview = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    
    const message = chat.lastMessage;
    const prefix = message.senderId._id === user._id ? 'You: ' : '';
    
    switch (message.type) {
      case 'text':
        return prefix + message.content;
      case 'image':
        return prefix + '📷 Photo';
      case 'video':
        return prefix + '🎥 Video';
      case 'audio':
        return prefix + '🎵 Audio';
      case 'document':
        return prefix + '📄 Document';
      case 'forwarded':
        return prefix + '↗️ Forwarded message';
      default:
        return prefix + 'Message';
    }
  };

  const getTypingIndicator = (chatId) => {
    const chatTypingUsers = typingUsers.get(chatId);
    console.log('[CHAT_LIST] ⌨️ getTypingIndicator called for chat:', chatId);
    console.log('[CHAT_LIST] ⌨️ chatTypingUsers:', chatTypingUsers);
    console.log('[CHAT_LIST] ⌨️ typingUsers map:', typingUsers);
    
    if (!chatTypingUsers || chatTypingUsers.size === 0) {
      console.log('[CHAT_LIST] ⌨️ No typing users for chat, returning null');
      return null;
    }

    const typingUsersArray = Array.from(chatTypingUsers);
    console.log('[CHAT_LIST] ⌨️ typingUsersArray:', typingUsersArray);
    
    if (typingUsersArray.length === 1) {
      const user = typingUsersArray[0];
      const indicator = `${user.fullName || user.username} is typing...`;
      console.log('[CHAT_LIST] ⌨️ Single user typing indicator:', indicator);
      return indicator;
    } else if (typingUsersArray.length === 2) {
      const [user1, user2] = typingUsersArray;
      const indicator = `${user1.fullName || user1.username} and ${user2.fullName || user2.username} are typing...`;
      console.log('[CHAT_LIST] ⌨️ Two users typing indicator:', indicator);
      return indicator;
    } else {
      const indicator = `${typingUsersArray.length} people are typing...`;
      console.log('[CHAT_LIST] ⌨️ Multiple users typing indicator:', indicator);
      return indicator;
    }
  };

  if (loading && chats.length === 0) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error && chats.length === 0) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => loadChats()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <MessageCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="heading-3 text-gray-900 dark:text-white">
                Conversations
              </h2>
              <p className="text-sm text-muted">
                {filteredChats.length} active chats
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="small"
              onClick={() => handleChatClick(null)}
              className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/30"
            >
              <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </Button>
            <Button
              variant="ghost"
              size="small"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="small"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </div>
        
        {/* Enhanced Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 w-5 h-5 transition-colors" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No chats found matching your search' : 'No chats yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  selectedChatId === chat._id 
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-200 dark:border-primary-800 shadow-medium' 
                    : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-soft'
                }`}
                onClick={() => handleChatClick(chat)}
                onContextMenu={(e) => handleContextMenu(e, chat)}
              >
                <div className="flex items-center space-x-4">
                  {/* Enhanced Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="relative">
                      <img
                        src={chat.otherParticipant?.profilePictureUrl || '/default-avatar.png'}
                        alt={chat.otherParticipant?.fullName || 'User'}
                        className="avatar-lg ring-2 ring-white dark:ring-gray-900 shadow-soft"
                      />
                      {onlineUsers.has(chat.otherParticipant?._id) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                        {chat.otherParticipant?.fullName || chat.otherParticipant?.username || 'Unknown User'}
                      </h3>
                      <div className="flex items-center space-x-2 ml-2">
                        {chat.userSettings?.isPinned && (
                          <Pin className="w-4 h-4 text-primary-500" />
                        )}
                        {chat.userSettings?.isMuted && (
                          <VolumeX className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-muted font-medium">
                          {formatLastMessageTime(chat.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-subtle truncate-2 leading-relaxed">
                        {getLastMessagePreview(chat)}
                      </p>
                      {getTypingIndicator(chat._id) && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 italic animate-pulse">
                          {getTypingIndicator(chat._id)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCallClick(chat, 'audio');
                      }}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full"
                    >
                      <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCallClick(chat, 'video');
                      }}
                      className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-full"
                    >
                      <Video className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </Button>
                  </div>
                </div>

                {/* Enhanced Unread Badge */}
                {chat.unreadCount > 0 && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 shadow-soft animate-bounce-in">
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </div>
                )}

                {/* Selection Indicator */}
                {selectedChatId === chat._id && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full"></div>
                )}
              </div>
            ))}
            
            {/* Load More */}
            {hasMore && (
              <div className="p-4 text-center">
                <Button
                  variant="outline"
                  onClick={loadMoreChats}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? <LoadingSpinner size="sm" /> : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
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
            onClick={() => handleChatAction('pin', contextMenu.chat)}
          >
            {contextMenu.chat.userSettings?.isPinned ? 'Unpin Chat' : 'Pin Chat'}
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleChatAction('mute', contextMenu.chat)}
          >
            {contextMenu.chat.userSettings?.isMuted ? 'Unmute Chat' : 'Mute Chat'}
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleChatAction('archive', contextMenu.chat)}
          >
            {contextMenu.chat.userSettings?.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
          </button>
          <hr className="my-2 border-gray-200 dark:border-gray-700" />
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => handleChatAction('delete', contextMenu.chat)}
          >
            Delete Chat
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

export default EnhancedChatList;
