import apiService from './enhancedApiService';

/**
 * Enhanced Call Service with comprehensive error handling and WebRTC integration
 */
class CallService {
  
  /**
   * Initiate a new call
   * @param {string} chatId - Chat ID
   * @param {string} type - Call type (audio/video)
   * @returns {Promise<Object>} Call object
   */
  async initiateCall(chatId, type = 'audio') {
    try {
      const response = await apiService.post('/api/v1/user/calls', {
        chatId,
        type
      });
      
      return {
        success: true,
        call: response.data.call,
        callId: response.data.call.callId,
        chatId: response.data.call.chatId,
        type: response.data.call.type,
        status: response.data.call.status,
        initiator: response.data.call.initiator,
        participants: response.data.call.participants,
        otherParticipant: response.data.call.otherParticipant
      };
    } catch (error) {
      console.error('[CallService] initiateCall error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Accept a call
   * @param {string} callId - Call ID
   * @param {Object} signalingData - Optional signaling data
   * @returns {Promise<Object>} Call acceptance result
   */
  async acceptCall(callId, signalingData = {}) {
    try {
      const response = await apiService.post(`/api/v1/user/calls/${callId}/accept`, {
        signalingData
      });
      
      return {
        success: true,
        callId: response.data.callId,
        status: response.data.status,
        signalingData: response.data.signalingData,
        acceptedAt: response.data.acceptedAt
      };
    } catch (error) {
      console.error('[CallService] acceptCall error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Reject a call
   * @param {string} callId - Call ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Call rejection result
   */
  async rejectCall(callId, reason = 'Call rejected') {
    try {
      const response = await apiService.post(`/api/v1/user/calls/${callId}/reject`, {
        reason
      });
      
      return {
        success: true,
        callId: response.data.callId,
        status: response.data.status,
        rejectedAt: response.data.rejectedAt,
        reason: response.data.reason
      };
    } catch (error) {
      console.error('[CallService] rejectCall error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * End a call
   * @param {string} callId - Call ID
   * @param {string} reason - End reason
   * @returns {Promise<Object>} Call end result
   */
  async endCall(callId, reason = 'user_ended') {
    try {
      const response = await apiService.post(`/api/v1/user/calls/${callId}/end`, {
        reason
      });
      
      return {
        success: true,
        callId: response.data.callId,
        status: response.data.status,
        endedAt: response.data.endedAt,
        duration: response.data.duration,
        endReason: response.data.endReason
      };
    } catch (error) {
      console.error('[CallService] endCall error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get call status
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Call status
   */
  async getCallStatus(callId) {
    try {
      const response = await apiService.get(`/api/v1/user/calls/${callId}/status`);
      
      return {
        success: true,
        call: response.data.call,
        callId: response.data.call.callId,
        type: response.data.call.type,
        status: response.data.call.status,
        duration: response.data.call.duration,
        startedAt: response.data.call.startedAt,
        answeredAt: response.data.call.answeredAt,
        endedAt: response.data.call.endedAt,
        initiator: response.data.call.initiator,
        participants: response.data.call.participants,
        settings: response.data.call.settings,
        webrtcData: response.data.call.webrtcData,
        quality: response.data.call.quality,
        endReason: response.data.call.endReason
      };
    } catch (error) {
      console.error('[CallService] getCallStatus error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get call history for a chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Call history
   */
  async getCallHistory(chatId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        startDate = null,
        endDate = null
      } = options;
      
      const params = { page, limit };
      if (type) params.type = type;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await apiService.get(`/api/v1/user/calls/chat/${chatId}/history`, {
        params
      });
      
      return {
        success: true,
        calls: response.data.calls,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('[CallService] getCallHistory error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get user's call statistics
   * @param {Object} dateRange - Optional date range
   * @returns {Promise<Object>} Call statistics
   */
  async getCallStats(dateRange = null) {
    try {
      const params = {};
      if (dateRange) {
        if (dateRange.start) params.startDate = dateRange.start;
        if (dateRange.end) params.endDate = dateRange.end;
      }
      
      const response = await apiService.get('/api/v1/user/calls/stats', {
        params
      });
      
      return {
        success: true,
        stats: response.data.stats
      };
    } catch (error) {
      console.error('[CallService] getCallStats error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Update call settings
   * @param {string} callId - Call ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateCallSettings(callId, settings) {
    try {
      const response = await apiService.put(`/api/v1/user/calls/${callId}/settings`, settings);
      
      return {
        success: true,
        callId: response.data.callId,
        settings: response.data.settings
      };
    } catch (error) {
      console.error('[CallService] updateCallSettings error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Handle WebRTC signaling
   * @param {string} callId - Call ID
   * @param {Object} signalingData - Signaling data
   * @returns {Promise<Object>} Signaling result
   */
  async handleSignaling(callId, signalingData) {
    try {
      const { type, data } = signalingData;
      
      const response = await apiService.post(`/api/v1/user/calls/${callId}/signaling`, {
        type,
        data
      });
      
      return {
        success: true,
        callId: response.data.callId,
        type: response.data.type,
        processed: response.data.processed
      };
    } catch (error) {
      console.error('[CallService] handleSignaling error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get active call for a chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Active call info
   */
  async getActiveCall(chatId) {
    try {
      const response = await apiService.get(`/api/v1/user/calls/chat/${chatId}/active`);
      
      return {
        success: true,
        activeCall: response.data.activeCall
      };
    } catch (error) {
      console.error('[CallService] getActiveCall error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Force cleanup calls for a chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Cleanup result
   */
  async forceCleanupCalls(chatId) {
    try {
      const response = await apiService.post(`/api/v1/user/calls/chat/${chatId}/cleanup`);
      
      return {
        success: true,
        cleanedCalls: response.data.cleanedCalls,
        chatId: response.data.chatId
      };
    } catch (error) {
      console.error('[CallService] forceCleanupCalls error:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Send WebRTC offer
   * @param {string} callId - Call ID
   * @param {RTCSessionDescriptionInit} offer - WebRTC offer
   * @returns {Promise<Object>} Signaling result
   */
  async sendOffer(callId, offer) {
    return this.handleSignaling(callId, {
      type: 'offer',
      data: {
        sdp: offer.sdp,
        type: offer.type
      }
    });
  }
  
  /**
   * Send WebRTC answer
   * @param {string} callId - Call ID
   * @param {RTCSessionDescriptionInit} answer - WebRTC answer
   * @returns {Promise<Object>} Signaling result
   */
  async sendAnswer(callId, answer) {
    return this.handleSignaling(callId, {
      type: 'answer',
      data: {
        sdp: answer.sdp,
        type: answer.type
      }
    });
  }
  
  /**
   * Send ICE candidate
   * @param {string} callId - Call ID
   * @param {RTCIceCandidateInit} candidate - ICE candidate
   * @returns {Promise<Object>} Signaling result
   */
  async sendIceCandidate(callId, candidate) {
    return this.handleSignaling(callId, {
      type: 'ice-candidate',
      data: {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      }
    });
  }
  
  /**
   * Update call quality metrics
   * @param {string} callId - Call ID
   * @param {Object} qualityData - Quality metrics
   * @returns {Promise<Object>} Update result
   */
  async updateCallQuality(callId, qualityData) {
    try {
      const response = await apiService.put(`/api/v1/user/calls/${callId}/quality`, qualityData);
      
      return {
        success: true,
        callId: response.data.callId,
        quality: response.data.quality
      };
    } catch (error) {
      console.error('[CallService] updateCallQuality error:', error);
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
        type: 'call_error',
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
const callService = new CallService();

export default callService;
