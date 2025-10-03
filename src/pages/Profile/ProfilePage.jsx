import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { authAPI, uploadAPI } from '../../utils/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import { User, Camera, Upload, Save, Edit } from 'lucide-react';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    bio: '',
    dob: '',
    gender: '',
    pronouns: '',
    location: {
      city: '',
      country: ''
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        dob: user.dob || '',
        gender: user.gender || '',
        pronouns: user.pronouns || '',
        location: {
          city: user.location?.city || '',
          country: user.location?.country || ''
        }
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authAPI.updateProfile(formData);
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setEditing(false);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      let result;
      if (type === 'profile') {
        result = await uploadAPI.uploadProfilePicture(file);
      } else if (type === 'id') {
        const documentType = 'id_proof';
        const documentNumber = 'DOC123456789'; // This should come from form
        result = await uploadAPI.uploadIdProof(file, documentType, documentNumber);
      }

      if (result.success) {
        setSuccess(`${type === 'profile' ? 'Profile picture' : 'ID proof'} uploaded successfully!`);
        // Refresh user data
        const profileResponse = await authAPI.getProfile();
        updateUser(profileResponse.data.data.user);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(`Failed to upload ${type === 'profile' ? 'profile picture' : 'ID proof'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Profile Settings</h1>
          <p className="text-secondary-600">Manage your account information and preferences</p>
        </div>
        <Button
          variant={editing ? 'secondary' : 'outline'}
          onClick={() => setEditing(!editing)}
        >
          {editing ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </>
          )}
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

      {/* Profile Picture Section */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Profile Picture</h2>
        <div className="flex items-center space-x-6">
          <div className="relative">
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-12 w-12 text-primary-600" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'profile')}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <div>
            <h3 className="font-medium text-secondary-900">Profile Photo</h3>
            <p className="text-sm text-secondary-600 mb-3">
              Upload a new profile picture. JPG, PNG or GIF. Max size 5MB.
            </p>
            <Button
              variant="outline"
              size="small"
              onClick={() => document.querySelector('input[type="file"]').click()}
              loading={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Information Form */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-6">Profile Information</h2>
        
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              disabled={!editing}
              required
            />
            
            <Input
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              disabled={!editing}
              required
            />
            
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!editing}
            />
            
            <Input
              label="Date of Birth"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleInputChange}
              disabled={!editing}
            />
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                disabled={!editing}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-secondary-100"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <Input
              label="Pronouns"
              name="pronouns"
              value={formData.pronouns}
              onChange={handleInputChange}
              disabled={!editing}
              placeholder="e.g., he/him, she/her, they/them"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              disabled={!editing}
              rows={4}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-secondary-100"
              placeholder="Tell us about yourself..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="City"
              name="location.city"
              value={formData.location.city}
              onChange={handleInputChange}
              disabled={!editing}
            />
            
            <Input
              label="Country"
              name="location.country"
              value={formData.location.country}
              onChange={handleInputChange}
              disabled={!editing}
            />
          </div>
          
          {editing && (
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* ID Verification Section */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Identity Verification</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
            <div>
              <h3 className="font-medium text-secondary-900">Upload ID Proof</h3>
              <p className="text-sm text-secondary-600">
                Upload a government-issued ID for account verification
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user?.verificationStatus === 'verified' 
                  ? 'bg-green-100 text-green-800'
                  : user?.verificationStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.verificationStatus || 'Not uploaded'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'id')}
                className="hidden"
                id="id-proof-upload"
              />
              <Button
                variant="outline"
                size="small"
                onClick={() => document.getElementById('id-proof-upload').click()}
                loading={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
