import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { statusAPI } from '../../utils/api';
import enhancedSocketService from '../../services/enhancedSocketService';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  Eye, 
  EyeOff, 
  Settings,
  Users,
  Circle,
  Edit
} from 'lucide-react';

const StatusPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Status data
  const [userStatus, setUserStatus] = useState({
    isOnline: false,
    lastSeen: null,
    customStatus: '',
    statusMessage: '',
    privacySettings: {
      showOnlineStatus: true,
      showLastSeen: true,
      showCustomStatus: true
    }
  });
  
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [recentlyActiveUsers, setRecentlyActiveUsers] = useState([]);
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchStatusData();
    setupSocketListeners();
    
    return () => {
      enhancedSocketService.off('user_status_update');
      enhancedSocketService.off('user_online');
      enhancedSocketService.off('user_offline');
    };
  }, []);

  const setupSocketListeners = () => {
    enhancedSocketService.on('user_status_update', (data) => {
      console.log('Status update received:', data);
      // Update local state with new status data
    });

    enhancedSocketService.on('user_online', (data) => {
      console.log('User came online:', data);
      // Update online users list
    });

    enhancedSocketService.on('user_offline', (data) => {
      console.log('User went offline:', data);
      // Update online users list
    });
  };

  const fetchStatusData = async () => {
    setLoading(true);
    try {
      const [userStatusRes, onlineUsersRes, recentUsersRes] = await Promise.all([
        statusAPI.getUserStatus(user._id),
        statusAPI.getOnlineUsers(),
        statusAPI.getRecentlyActiveUsers()
      ]);

      setUserStatus(userStatusRes.data.data.status);
      setOnlineUsers(onlineUsersRes.data.data.users);
      setRecentlyActiveUsers(recentUsersRes.data.data.users);
      setStatusMessage(userStatusRes.data.data.status.statusMessage || '');
    } catch (error) {
      setError('Failed to fetch status data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const statusData = {
        isOnline: true,
        statusMessage: statusMessage,
        customStatus: statusMessage ? 'custom' : 'online'
      };

      const result = await statusAPI.updateUserStatus(statusData);
      if (result.data.success) {
        setUserStatus(prev => ({ ...prev, ...statusData }));
        setEditingStatus(false);
        setSuccess('Status updated successfully!');
        
        // Emit status update via socket
        enhancedSocketService.updateStatus(statusData);
      } else {
        setError(result.data.message || 'Failed to update status');
      }
    } catch (error) {
      setError('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyUpdate = async (privacyData) => {
    setLoading(true);
    
    try {
      const result = await statusAPI.updatePrivacySettings(privacyData);
      if (result.data.success) {
        setUserStatus(prev => ({
          ...prev,
          privacySettings: { ...prev.privacySettings, ...privacyData }
        }));
        setSuccess('Privacy settings updated!');
      } else {
        setError('Failed to update privacy settings');
      }
    } catch (error) {
      setError('Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffInMinutes = Math.floor((now - lastSeen) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'text-green-500' : 'text-secondary-400';
  };

  const getStatusIcon = (isOnline) => {
    return isOnline ? Wifi : WifiOff;
  };

  const UserCard = ({ user, showLastSeen = true }) => {
    const StatusIcon = getStatusIcon(user.isOnline);
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              user.isOnline ? 'bg-green-500' : 'bg-secondary-400'
            }`}>
              <StatusIcon className="h-2 w-2 text-white m-0.5" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-secondary-900">
              {user.fullName || user.username}
            </h3>
            <p className="text-sm text-secondary-600">@{user.username}</p>
            {showLastSeen && (
              <p className="text-xs text-secondary-500">
                {user.isOnline ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
              </p>
            )}
            {user.statusMessage && (
              <p className="text-xs text-primary-600 italic mt-1">
                "{user.statusMessage}"
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && !userStatus) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Status & Presence</h1>
        <p className="text-secondary-600">Manage your online status and presence settings</p>
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

      {/* Current Status */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">Your Status</h2>
          <Button
            size="small"
            variant="outline"
            onClick={() => setEditingStatus(!editingStatus)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {editingStatus ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${getStatusColor(userStatus.isOnline)}`}>
            <Circle className="h-4 w-4 fill-current" />
            <span className="font-medium">
              {userStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {userStatus.statusMessage && (
            <div className="flex-1">
              <p className="text-sm text-secondary-600 italic">
                "{userStatus.statusMessage}"
              </p>
            </div>
          )}
        </div>

        {editingStatus && (
          <form onSubmit={handleStatusUpdate} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Status Message (Optional)
              </label>
              <Input
                placeholder="What's on your mind?"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-secondary-500 mt-1">
                {statusMessage.length}/100 characters
              </p>
            </div>
            <div className="flex space-x-3">
              <Button type="submit" loading={loading}>
                Update Status
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingStatus(false);
                  setStatusMessage(userStatus.statusMessage || '');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Privacy Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wifi className="h-5 w-5 text-secondary-600" />
              <div>
                <h3 className="font-medium text-secondary-900">Show Online Status</h3>
                <p className="text-sm text-secondary-600">Let others see when you're online</p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyUpdate({ showOnlineStatus: !userStatus.privacySettings.showOnlineStatus })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userStatus.privacySettings.showOnlineStatus ? 'bg-primary-600' : 'bg-secondary-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userStatus.privacySettings.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-secondary-600" />
              <div>
                <h3 className="font-medium text-secondary-900">Show Last Seen</h3>
                <p className="text-sm text-secondary-600">Let others see when you were last active</p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyUpdate({ showLastSeen: !userStatus.privacySettings.showLastSeen })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userStatus.privacySettings.showLastSeen ? 'bg-primary-600' : 'bg-secondary-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userStatus.privacySettings.showLastSeen ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Edit className="h-5 w-5 text-secondary-600" />
              <div>
                <h3 className="font-medium text-secondary-900">Show Custom Status</h3>
                <p className="text-sm text-secondary-600">Let others see your status messages</p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyUpdate({ showCustomStatus: !userStatus.privacySettings.showCustomStatus })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userStatus.privacySettings.showCustomStatus ? 'bg-primary-600' : 'bg-secondary-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userStatus.privacySettings.showCustomStatus ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Online Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">
            Online Users ({onlineUsers.length})
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {onlineUsers.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
            {onlineUsers.length === 0 && (
              <p className="text-secondary-500 text-center py-4">No users online</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">
            Recently Active ({recentlyActiveUsers.length})
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentlyActiveUsers.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
            {recentlyActiveUsers.length === 0 && (
              <p className="text-secondary-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;
