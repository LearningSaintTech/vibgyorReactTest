import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { authAPI, statusAPI } from '../../utils/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Volume2, 
  Camera,
  Wifi,
  Lock,
  Globe,
  Palette,
  Save
} from 'lucide-react';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('account');

  // Settings state
  const [settings, setSettings] = useState({
    // Account settings
    account: {
      email: user?.email || '',
      username: user?.username || '',
      fullName: user?.fullName || '',
    },
    
    // Notification settings
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      messageNotifications: true,
      callNotifications: true,
      followRequestNotifications: true,
      soundEnabled: true,
    },
    
    // Privacy settings
    privacy: {
      showOnlineStatus: true,
      showLastSeen: true,
      showCustomStatus: true,
      allowMessageRequests: true,
      allowFollowRequests: true,
      profileVisibility: 'public', // public, friends, private
    },
    
    // Audio/Video settings
    media: {
      microphoneEnabled: true,
      cameraEnabled: true,
      speakerEnabled: true,
      videoQuality: '720p',
      audioQuality: 'high',
    },
    
    // Appearance settings
    appearance: {
      theme: 'light', // light, dark, auto
      language: 'en',
      fontSize: 'medium', // small, medium, large
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch user settings from API
      const response = await authAPI.getProfile();
      if (response.data.success) {
        const userData = response.data.data.user;
        setSettings(prev => ({
          ...prev,
          account: {
            email: userData.email || '',
            username: userData.username || '',
            fullName: userData.fullName || '',
          }
        }));
      }
    } catch (error) {
      setError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = async (category) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      
      switch (category) {
        case 'account':
          result = await authAPI.updateProfile(settings.account);
          break;
        case 'privacy':
          result = await statusAPI.updatePrivacySettings(settings.privacy);
          break;
        default:
          // For other settings, you would have specific API endpoints
          result = { data: { success: true } };
      }

      if (result.data.success) {
        setSuccess(`${category} settings saved successfully!`);
      } else {
        setError(result.data.message || 'Failed to save settings');
      }
    } catch (error) {
      setError(`Failed to save ${category} settings`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'media', label: 'Audio/Video', icon: Camera },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Account Information</h3>
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={settings.account.fullName}
            onChange={(e) => handleSettingChange('account', 'fullName', e.target.value)}
          />
          <Input
            label="Username"
            value={settings.account.username}
            onChange={(e) => handleSettingChange('account', 'username', e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={settings.account.email}
            onChange={(e) => handleSettingChange('account', 'email', e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={() => handleSaveSettings('account')}
          loading={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-secondary-900">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h4>
                <p className="text-sm text-secondary-600">
                  {key.includes('email') ? 'Receive email notifications' :
                   key.includes('push') ? 'Receive push notifications' :
                   key.includes('message') ? 'Get notified about new messages' :
                   key.includes('call') ? 'Get notified about incoming calls' :
                   key.includes('follow') ? 'Get notified about follow requests' :
                   'Enable notification sounds'}
                </p>
              </div>
              <button
                onClick={() => handleSettingChange('notifications', key, !value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-primary-600' : 'bg-secondary-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Privacy & Security</h3>
        <div className="space-y-4">
          {Object.entries(settings.privacy).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-secondary-900">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h4>
                <p className="text-sm text-secondary-600">
                  {key.includes('Online') ? 'Let others see when you\'re online' :
                   key.includes('LastSeen') ? 'Let others see when you were last active' :
                   key.includes('CustomStatus') ? 'Let others see your status messages' :
                   key.includes('MessageRequests') ? 'Allow others to send you message requests' :
                   key.includes('FollowRequests') ? 'Allow others to send you follow requests' :
                   'Control who can see your profile'}
                </p>
              </div>
              {key === 'profileVisibility' ? (
                <select
                  value={value}
                  onChange={(e) => handleSettingChange('privacy', key, e.target.value)}
                  className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              ) : (
                <button
                  onClick={() => handleSettingChange('privacy', key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary-600' : 'bg-secondary-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={() => handleSaveSettings('privacy')}
          loading={loading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );

  const renderMediaSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Audio & Video Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium text-secondary-900">Audio Settings</h4>
              {Object.entries(settings.media).filter(([key]) => key.includes('audio') || key.includes('microphone') || key.includes('speaker')).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-secondary-700">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  <button
                    onClick={() => handleSettingChange('media', key, !value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-primary-600' : 'bg-secondary-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-secondary-900">Video Settings</h4>
              {Object.entries(settings.media).filter(([key]) => key.includes('video') || key.includes('camera')).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-secondary-700">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  {key.includes('Quality') ? (
                    <select
                      value={value}
                      onChange={(e) => handleSettingChange('media', key, e.target.value)}
                      className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="480p">480p</option>
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                    </select>
                  ) : (
                    <button
                      onClick={() => handleSettingChange('media', key, !value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-primary-600' : 'bg-secondary-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Appearance & Language</h3>
        <div className="space-y-4">
          {Object.entries(settings.appearance).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-secondary-900">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h4>
                <p className="text-sm text-secondary-600">
                  {key.includes('theme') ? 'Choose your preferred theme' :
                   key.includes('language') ? 'Select your preferred language' :
                   'Adjust the text size'}
                </p>
              </div>
              <select
                value={value}
                onChange={(e) => handleSettingChange('appearance', key, e.target.value)}
                className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {key === 'theme' ? (
                  <>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </>
                ) : key === 'language' ? (
                  <>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </>
                ) : (
                  <>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </>
                )}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'media':
        return renderMediaSettings();
      case 'appearance':
        return renderAppearanceSettings();
      default:
        return renderAccountSettings();
    }
  };

  if (loading && !settings.account.email) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
          <p className="text-secondary-600">Manage your account settings and preferences</p>
        </div>
        <Button variant="danger" onClick={handleLogout}>
          Logout
        </Button>
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

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
