import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { socialAPI } from '../../utils/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Users, UserPlus, Search, Shield, Flag, UserMinus } from 'lucide-react';

const SocialPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State for different tabs
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchSocialData();
  }, [activeTab]);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'followers':
          const followersRes = await socialAPI.getFollowers();
          setFollowers(followersRes.data.data.followers);
          break;
        case 'following':
          const followingRes = await socialAPI.getFollowing();
          setFollowing(followingRes.data.data.following);
          break;
        case 'blocked':
          const blockedRes = await socialAPI.getBlockedUsers();
          setBlockedUsers(blockedRes.data.data.blockedUsers);
          break;
        default:
          break;
      }
    } catch (error) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFollowRequest = async (userId, message = '') => {
    try {
      const result = await socialAPI.sendFollowRequest(userId, message);
      if (result.success) {
        setSuccess('Follow request sent successfully!');
        setSearchResults(prev => prev.filter(user => user._id !== userId));
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to send follow request');
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      const result = await socialAPI.unfollowUser(userId);
      if (result.success) {
        setSuccess('Unfollowed successfully!');
        setFollowing(prev => prev.filter(user => user._id !== userId));
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to unfollow user');
    }
  };

  const handleBlock = async (userId) => {
    try {
      const result = await socialAPI.blockUser(userId);
      if (result.success) {
        setSuccess('User blocked successfully!');
        // Remove from following/followers lists
        setFollowing(prev => prev.filter(user => user._id !== userId));
        setFollowers(prev => prev.filter(user => user._id !== userId));
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to block user');
    }
  };

  const handleUnblock = async (userId) => {
    try {
      const result = await socialAPI.unblockUser(userId);
      if (result.success) {
        setSuccess('User unblocked successfully!');
        setBlockedUsers(prev => prev.filter(user => user._id !== userId));
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to unblock user');
    }
  };

  const handleReport = async (userId, reportData) => {
    try {
      const result = await socialAPI.reportUser(userId, reportData);
      if (result.success) {
        setSuccess('User reported successfully!');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to report user');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // This would be a search API call - implementing basic search for now
      // In a real app, you'd have a search endpoint
      const searchRes = await socialAPI.getFollowing(); // Placeholder
      setSearchResults(searchRes.data.data.following.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } catch (error) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const UserCard = ({ user, showActions = true }) => (
    <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4">
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-secondary-900">{user.fullName || user.username}</h3>
          <p className="text-sm text-secondary-600">@{user.username}</p>
          {user.bio && <p className="text-sm text-secondary-500 mt-1">{user.bio}</p>}
        </div>
      </div>
      
      {showActions && (
        <div className="flex space-x-2 mt-4">
          {activeTab === 'discover' && (
            <Button
              size="small"
              onClick={() => handleSendFollowRequest(user._id)}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Follow
            </Button>
          )}
          
          {activeTab === 'following' && (
            <Button
              size="small"
              variant="outline"
              onClick={() => handleUnfollow(user._id)}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Unfollow
            </Button>
          )}
          
          <Button
            size="small"
            variant="outline"
            onClick={() => handleBlock(user._id)}
          >
            <Shield className="h-4 w-4 mr-1" />
            Block
          </Button>
          
          <Button
            size="small"
            variant="danger"
            onClick={() => handleReport(user._id, {
              reportType: 'spam',
              description: 'Inappropriate content'
            })}
          >
            <Flag className="h-4 w-4 mr-1" />
            Report
          </Button>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'discover', label: 'Discover People', icon: Search },
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'following', label: 'Following', icon: UserPlus },
    { id: 'blocked', label: 'Blocked Users', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Social</h1>
        <p className="text-secondary-600">Connect with people and manage your social network</p>
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search Bar for Discover Tab */}
      {activeTab === 'discover' && (
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4">
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search for people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" loading={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        {loading && <LoadingSpinner />}
        
        {activeTab === 'discover' && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
          </div>
        )}

        {activeTab === 'followers' && followers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {followers.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
          </div>
        )}

        {activeTab === 'following' && following.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {following.map((user) => (
              <UserCard key={user._id} user={user} />
            ))}
          </div>
        )}

        {activeTab === 'blocked' && blockedUsers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blockedUsers.map((user) => (
              <div key={user._id} className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary-900">{user.fullName || user.username}</h3>
                      <p className="text-sm text-secondary-600">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => handleUnblock(user._id)}
                  >
                    Unblock
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty States */}
        {!loading && (
          <>
            {activeTab === 'discover' && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">No users found</h3>
                <p className="text-secondary-600">Try searching with a different term</p>
              </div>
            )}

            {activeTab === 'followers' && followers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">No followers yet</h3>
                <p className="text-secondary-600">Share your profile to get followers</p>
              </div>
            )}

            {activeTab === 'following' && following.length === 0 && (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">Not following anyone</h3>
                <p className="text-secondary-600">Discover people to follow</p>
              </div>
            )}

            {activeTab === 'blocked' && blockedUsers.length === 0 && (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">No blocked users</h3>
                <p className="text-secondary-600">You haven't blocked anyone yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SocialPage;
