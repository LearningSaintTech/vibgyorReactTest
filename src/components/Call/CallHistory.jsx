import React, { useState, useEffect } from 'react';
import { Phone, Video, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { callAPI } from '../../utils/api';

const CallHistory = ({ chatId, onClose }) => {
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (chatId) {
      fetchCallHistory();
    }
  }, [chatId]);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      const response = await callAPI.getCallHistory(chatId);
      
      if (response.data.success) {
        setCallHistory(response.data.data || []);
      } else {
        setError('Failed to fetch call history');
      }
    } catch (error) {
      console.error('Failed to fetch call history:', error);
      setError('Failed to fetch call history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ended':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'missed':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'ended':
        return 'Ended';
      case 'rejected':
        return 'Rejected';
      case 'missed':
        return 'Missed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading call history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Call History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="text-center text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="text-center text-gray-500">
              <Phone className="h-8 w-8 mx-auto mb-2" />
              <p>No call history found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {callHistory.map((call) => (
                <div
                  key={call._id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {call.type === 'video' ? (
                      <Video className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Phone className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {call.type === 'video' ? 'Video Call' : 'Audio Call'}
                      </span>
                      {getStatusIcon(call.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatDate(call.startedAt)}</span>
                      {call.duration > 0 && (
                        <span>Duration: {formatDuration(call.duration)}</span>
                      )}
                      <span>{getStatusText(call.status)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallHistory;
