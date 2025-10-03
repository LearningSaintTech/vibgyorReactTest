import apiService from './enhancedApiService';

/**
 * Enhanced Message Service with comprehensive error handling and file upload
 */
class MessageService {
  
  /**
   * Send a text message
   * @param {string} chatId - Chat ID
   * @param {string} content - Message content
   * @param {string} type - Message type
   * @param {string} replyTo - Reply to message ID
   * @param {string} forwardedFrom - Forwarded from message ID
   * @returns {Promise<Object>} Sent message
   */
  async sendMessage(chatId, content, type = 'text', replyTo = null, forwardedFrom = null) {
    try {
      const response = await apiService.post('/api/v1/user/messages', {
        chatId,
        type,
        content,
        replyTo,
        forwardedFrom
      });
      
      return {
        success: true,
        message: response.data.message,
        messageId: response.data.messageId,
        chatId: response.data.chatId
      };
    } catch (error) {
      console.error('[MessageService] sendMessage error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Send a file message
   * @param {string} chatId - Chat ID
   * @param {File} file - File to upload
   * @param {string} type - Message type (audio, video, image, document)
   * @param {Function} onProgress - Upload progress callback
   * @returns {Promise<Object>} Sent message
   */
  async sendFileMessage(chatId, file, type, onProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);
      formData.append('type', type);
      
      const response = await apiService.uploadFile('/user/messages', formData, onProgress);
      
      return {
        success: true,
        message: response.data.message,
        messageId: response.data.messageId,
        chatId: response.data.chatId
      };
    } catch (error) {
      console.error('[MessageService] sendFileMessage error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get messages in a chat with pagination
   * @param {string} chatId - Chat ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Array of messages
   */
  async getChatMessages(chatId, page = 1, limit = 50) {
    try {
      const response = await apiService.get(`/api/v1/user/messages/chat/${chatId}`, {
        params: { page, limit }
      });
      
      return {
        success: true,
        messages: response.data.messages,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('[MessageService] getChatMessages error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Mark messages as read in a chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Read result
   */
  async markMessagesAsRead(chatId) {
    try {
      const response = await apiService.put(`/api/v1/user/messages/chat/${chatId}/read`);
      
      return {
        success: true,
        readCount: response.data.readCount,
        unreadCount: response.data.unreadCount,
        chatId: response.data.chatId
      };
    } catch (error) {
      console.error('[MessageService] markMessagesAsRead error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} content - New message content
   * @returns {Promise<Object>} Updated message
   */
  async editMessage(messageId, content) {
    try {
      const response = await apiService.put(`/api/v1/user/messages/${messageId}`, {
        content
      });
      
      return {
        success: true,
        messageId: response.data.messageId,
        content: response.data.content,
        editedAt: response.data.editedAt
      };
    } catch (error) {
      console.error('[MessageService] editMessage error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteMessage(messageId) {
    try {
      const response = await apiService.delete(`/api/v1/user/messages/${messageId}`);
      
      return {
        success: true,
        messageId: response.data.messageId,
        isDeleted: response.data.isDeleted
      };
    } catch (error) {
      console.error('[MessageService] deleteMessage error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Add reaction to a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} Reaction result
   */
  async reactToMessage(messageId, emoji) {
    try {
      const response = await apiService.post(`/api/v1/user/messages/${messageId}/reactions`, {
        emoji
      });
      
      return {
        success: true,
        messageId: response.data.messageId,
        reactions: response.data.reactions
      };
    } catch (error) {
      console.error('[MessageService] reactToMessage error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Remove reaction from a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Reaction removal result
   */
  async removeReaction(messageId) {
    try {
      const response = await apiService.delete(`/api/v1/user/messages/${messageId}/reactions`);
      
      return {
        success: true,
        messageId: response.data.messageId,
        reactions: response.data.reactions
      };
    } catch (error) {
      console.error('[MessageService] removeReaction error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Forward a message to another chat
   * @param {string} messageId - Message ID
   * @param {string} targetChatId - Target chat ID
   * @returns {Promise<Object>} Forward result
   */
  async forwardMessage(messageId, targetChatId) {
    try {
      const response = await apiService.post(`/api/v1/user/messages/${messageId}/forward`, {
        targetChatId
      });
      
      return {
        success: true,
        messageId: response.data.messageId,
        targetChatId: response.data.targetChatId,
        content: response.data.content,
        forwardedFrom: response.data.forwardedFrom
      };
    } catch (error) {
      console.error('[MessageService] forwardMessage error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Search messages in a chat
   * @param {string} chatId - Chat ID
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Search results
   */
  async searchMessages(chatId, query, page = 1, limit = 20) {
    try {
      const response = await apiService.get(`/api/v1/user/messages/chat/${chatId}/search`, {
        params: { q: query, page, limit }
      });
      
      return {
        success: true,
        messages: response.data.messages,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('[MessageService] searchMessages error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get media messages in a chat
   * @param {string} chatId - Chat ID
   * @param {string} type - Media type filter
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Media messages
   */
  async getChatMedia(chatId, type = null, page = 1, limit = 20) {
    try {
      const params = { page, limit };
      if (type) params.type = type;
      
      const response = await apiService.get(`/api/v1/user/messages/chat/${chatId}/media`, {
        params
      });
      
      return {
        success: true,
        mediaMessages: response.data.mediaMessages,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('[MessageService] getChatMedia error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get message details
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Message details
   */
  async getMessageDetails(messageId) {
    try {
      const response = await apiService.get(`/api/v1/user/messages/${messageId}`);
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('[MessageService] getMessageDetails error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get file download URL
   * @param {string} messageId - Message ID
   * @returns {Promise<string>} Download URL
   */
  async getFileDownloadUrl(messageId) {
    try {
      const response = await apiService.get(`/api/v1/user/messages/${messageId}/download`);
      
      return {
        success: true,
        downloadUrl: response.data.downloadUrl,
        fileName: response.data.fileName,
        fileSize: response.data.fileSize
      };
    } catch (error) {
      console.error('[MessageService] getFileDownloadUrl error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Handle service errors
   * @param {Error} error - Error object
   * @returns {Object} Formatted error
   */
  handleError(error) {
    if (error.type === 'response_error') {
      return {
        type: 'message_error',
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
const messageService = new MessageService();

export default messageService;
