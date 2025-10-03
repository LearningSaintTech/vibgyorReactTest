import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { socialAPI, chatAPI, statusAPI } from '../../utils/api';
import { Users, MessageCircle, Phone, Activity, TrendingUp } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    social: null,
    chat: null,
    status: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [socialStats, chatStats, statusStats] = await Promise.all([
        socialAPI.getSocialStats(),
        chatAPI.getChatStats(),
        statusAPI.getStatusStats()
      ]);

      setStats({
        social: socialStats.data.data,
        chat: chatStats.data.data,
        status: statusStats.data.data
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Followers',
      value: stats.social?.followersCount || 0,
      icon: Users,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Following',
      value: stats.social?.followingCount || 0,
      icon: Users,
      color: 'green',
      change: '+5%'
    },
    {
      title: 'Active Chats',
      value: stats.chat?.activeChatsCount || 0,
      icon: MessageCircle,
      color: 'purple',
      change: '+8%'
    },
    {
      title: 'Online Status',
      value: stats.status?.isOnline ? 'Online' : 'Offline',
      icon: Activity,
      color: 'orange',
      change: stats.status?.isOnline ? 'Active' : 'Inactive'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.fullName || user?.username || 'User'}!
        </h1>
        <p className="text-primary-100">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-secondary-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">{stat.change}</span>
                <span className="text-sm text-secondary-500 ml-2">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-lg">
              <MessageCircle className="h-5 w-5 text-primary-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary-900">New message from John</p>
                <p className="text-xs text-secondary-600">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary-900">New follower: Sarah</p>
                <p className="text-xs text-secondary-600">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary-900">Missed call from Mike</p>
                <p className="text-xs text-secondary-600">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-600">Messages this week</span>
              <span className="text-sm font-medium text-secondary-900">47</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-600">Calls this month</span>
              <span className="text-sm font-medium text-secondary-900">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-600">Profile views</span>
              <span className="text-sm font-medium text-secondary-900">234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-600">Account age</span>
              <span className="text-sm font-medium text-secondary-900">30 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
