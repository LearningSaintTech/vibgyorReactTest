import apiService from './enhancedApiService';

/**
 * Enhanced Chat Service with comprehensive error handling
 */
class ChatService {
  
  /**
   * Create or get chat between users
   * @param {string} otherUserId - Other user ID
   * @returns {Promise<Object>} Chat object
   */
  async createOrGetChat(otherUserId) {
    try {
      const response = await apiService.post('/api/v1/user/chats', {
        otherUserId
      });
      
      return {
        success: true,
        chat: response.data.chat,
        unreadCount: response.data.unreadCount,
        canChat: response.data.canChat,
        reason: response.data.reason
      };
    } catch (error) {
      console.error('[ChatService] createOrGetChat error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get user's chats with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Array of chats
   */
  async getUserChats(page = 1, limit = 20) {
    try {
      const response = await apiService.get('/api/v1/user/chats', {
        params: { page, limit }
      });
      
      return {
        success: true,
        chats: response.data.chats,
        pagination: response.meta?.pagination || { page, limit, total: response.data.chats.length }
      };
    } catch (error) {
      console.error('[ChatService] getUserChats error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get chat details
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Chat details
   */
  async getChatDetails(chatId) {
    try {
      const response = await apiService.get(`/user/chats/${chatId}`);
      
      return {
        success: true,
        chat: response.data.chat,
        unreadCount: response.data.unreadCount,
        userSettings: response.data.userSettings,
        otherParticipant: response.data.otherParticipant
      };
    } catch (error) {
      console.error('[ChatService] getChatDetails error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Update chat settings (archive, pin, mute)
   * @param {string} chatId - Chat ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateChatSettings(chatId, settings) {
    try {
      const response = await apiService.put(`/user/chats/${chatId}/settings`, settings);
      
      return {
        success: true,
        settings: response.data.settings,
        chatId: response.data.chatId
      };
    } catch (error) {
      console.error('[ChatService] updateChatSettings error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Delete chat (archive for user)
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteChat(chatId) {
    try {
      const response = await apiService.delete(`/user/chats/${chatId}`);
      
      return {
        success: true,
        message: response.message,
        chatId: response.data.chatId
      };
    } catch (error) {
      console.error('[ChatService] deleteChat error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Search chats by participant name
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Filtered chats
   */
  async searchChats(query, page = 1, limit = 20) {
    try {
      const response = await apiService.get('/api/v1/user/chats/search', {
        params: { q: query, page, limit }
      });
      
      return {
        success: true,
        chats: response.data.chats,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('[ChatService] searchChats error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get chat statistics
   * @returns {Promise<Object>} Chat statistics
   */
  async getChatStats() {
    try {
      const response = await apiService.get('/api/v1/user/chats/stats');
      
      return {
        success: true,
        stats: response.data.stats
      };
    } catch (error) {
      console.error('[ChatService] getChatStats error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Join chat room for real-time updates
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Join result
   */
  async joinChat(chatId) {
    try {
      const response = await apiService.post(`/user/chats/${chatId}/join`);
      
      return {
        success: true,
        chatId: response.data.chatId,
        userId: response.data.userId,
        joined: response.data.joined,
        unreadCount: response.data.unreadCount
      };
    } catch (error) {
      console.error('[ChatService] joinChat error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Leave chat room
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Leave result
   */
  async leaveChat(chatId) {
    try {
      const response = await apiService.post(`/user/chats/${chatId}/leave`);
      
      return {
        success: true,
        chatId: response.data.chatId,
        userId: response.data.userId,
        left: response.data.left
      };
    } catch (error) {
      console.error('[ChatService] leaveChat error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Archive chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Archive result
   */
  async archiveChat(chatId) {
    return this.updateChatSettings(chatId, { isArchived: true });
  }
  
  /**
   * Unarchive chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Unarchive result
   */
  async unarchiveChat(chatId) {
    return this.updateChatSettings(chatId, { isArchived: false });
  }
  
  /**
   * Pin chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Pin result
   */
  async pinChat(chatId) {
    return this.updateChatSettings(chatId, { isPinned: true });
  }
  
  /**
   * Unpin chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Unpin result
   */
  async unpinChat(chatId) {
    return this.updateChatSettings(chatId, { isPinned: false });
  }
  
  /**
   * Mute chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Mute result
   */
  async muteChat(chatId) {
    return this.updateChatSettings(chatId, { isMuted: true });
  }
  
  /**
   * Unmute chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Unmute result
   */
  async unmuteChat(chatId) {
    return this.updateChatSettings(chatId, { isMuted: false });
  }
  
  /**
   * Handle service errors
   * @param {Error} error - Error object
   * @returns {Object} Formatted error
   */
  handleError(error) {
    if (error.type === 'response_error') {
      return {
        type: 'chat_error',
        status: error.status,
        message: error.message,
        errors: error.errors,
        data: error.data
      };
    } else if (error.type === 'network_error') {
      return {
        type: 'network_error',
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      return {
        type: 'unknown_error',
        message: 'An unexpected error occurred',
        status: 0
      };
    }
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;
