import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { socialAPI } from '../../utils/api';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { UserCheck, UserPlus, UserX, Clock, Check, X } from 'lucide-react';

const FollowRequestsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for follow requests
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    fetchFollowRequests();
  }, [activeTab]);

  const fetchFollowRequests = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const response = await socialAPI.getPendingFollowRequests();
        setPendingRequests(response.data.data.followRequests);
      } else {
        const response = await socialAPI.getSentFollowRequests();
        setSentRequests(response.data.data.followRequests);
      }
    } catch (error) {
      setError('Failed to fetch follow requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      const result = await socialAPI.acceptFollowRequest(requestId);
      if (result.success) {
        setSuccess('Follow request accepted!');
        setPendingRequests(prev => prev.filter(req => req._id !== requestId));
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to accept follow request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      const result = await socialAPI.rejectFollowRequest(requestId);
      if (result.success) {
        setSuccess('Follow request rejected!');
        setPendingRequests(prev => prev.filter(req => req._id !== requestId));
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to reject follow request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      const result = await socialAPI.cancelFollowRequest(requestId);
      if (result.success) {
        setSuccess('Follow request cancelled!');
        setSentRequests(prev => prev.filter(req => req._id !== requestId));
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to cancel follow request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const RequestCard = ({ request, type }) => (
    <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-secondary-900">
              {request.sender?.fullName || request.receiver?.fullName || 'Unknown User'}
            </h3>
            <p className="text-sm text-secondary-600">
              @{request.sender?.username || request.receiver?.username}
            </p>
            {request.message && (
              <p className="text-sm text-secondary-500 mt-1 italic">
                "{request.message}"
              </p>
            )}
            <div className="flex items-center space-x-2 mt-1">
              <Clock className="h-3 w-3 text-secondary-400" />
              <span className="text-xs text-secondary-500">
                {new Date(request.createdAt).toLocaleDateString()}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                request.status === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : request.status === 'accepted'
                  ? 'bg-green-100 text-green-800'
                  : request.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {request.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          {type === 'pending' && request.status === 'pending' && (
            <>
              <Button
                size="small"
                onClick={() => handleAcceptRequest(request._id)}
                loading={processingRequest === request._id}
                disabled={processingRequest === request._id}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={() => handleRejectRequest(request._id)}
                loading={processingRequest === request._id}
                disabled={processingRequest === request._id}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {type === 'sent' && request.status === 'pending' && (
            <Button
              size="small"
              variant="outline"
              onClick={() => handleCancelRequest(request._id)}
              loading={processingRequest === request._id}
              disabled={processingRequest === request._id}
            >
              <UserX className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}

          {type === 'sent' && request.status === 'accepted' && (
            <span className="flex items-center text-green-600 text-sm font-medium">
              <Check className="h-4 w-4 mr-1" />
              Accepted
            </span>
          )}

          {type === 'sent' && request.status === 'rejected' && (
            <span className="flex items-center text-red-600 text-sm font-medium">
              <X className="h-4 w-4 mr-1" />
              Rejected
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'pending', label: 'Pending Requests', icon: UserCheck, count: pendingRequests.length },
    { id: 'sent', label: 'Sent Requests', icon: UserPlus, count: sentRequests.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Follow Requests</h1>
        <p className="text-secondary-600">Manage your follow requests</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activeTab === tab.id 
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-secondary-100 text-secondary-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading && <LoadingSpinner />}
        
        {activeTab === 'pending' && pendingRequests.length > 0 && (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <RequestCard key={request._id} request={request} type="pending" />
            ))}
          </div>
        )}

        {activeTab === 'sent' && sentRequests.length > 0 && (
          <div className="space-y-4">
            {sentRequests.map((request) => (
              <RequestCard key={request._id} request={request} type="sent" />
            ))}
          </div>
        )}

        {/* Empty States */}
        {!loading && (
          <>
            {activeTab === 'pending' && pendingRequests.length === 0 && (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">No pending requests</h3>
                <p className="text-secondary-600">You don't have any pending follow requests</p>
              </div>
            )}

            {activeTab === 'sent' && sentRequests.length === 0 && (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">No sent requests</h3>
                <p className="text-secondary-600">You haven't sent any follow requests yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FollowRequestsPage;
