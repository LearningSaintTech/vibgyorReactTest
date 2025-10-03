import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Smartphone, Mail } from 'lucide-react';

const LoginPage = () => {
  const { login, sendPhoneOTP, resendPhoneOTP, sendEmailOTP, verifyEmailOTP } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('phone'); // phone, verify-phone, email, verify-email
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Phone form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneOTP, setPhoneOTP] = useState('');
  
  // Email form state
  const [email, setEmail] = useState('');
  const [emailOTP, setEmailOTP] = useState('');

  const handleSendPhoneOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await sendPhoneOTP(phoneNumber, countryCode);
      if (result.success) {
        setStep('verify-phone');
        setSuccess('OTP sent to your phone number');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await login(phoneNumber, phoneOTP);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Phone verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendPhoneOTP = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await resendPhoneOTP(phoneNumber);
      if (result.success) {
        setSuccess('OTP resent successfully');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await sendEmailOTP(email);
      if (result.success) {
        setStep('verify-email');
        setSuccess('OTP sent to your email');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to send email OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await verifyEmailOTP(emailOTP);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Email verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">Welcome to Vibgyor</h1>
          <p className="text-secondary-600">Connect with people around the world</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {step === 'phone' && (
            <form onSubmit={handleSendPhoneOTP} className="space-y-6">
              <div className="text-center">
                <Smartphone className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-secondary-900">Enter your phone number</h2>
                <p className="text-secondary-600 text-sm mt-1">
                  We'll send you a verification code
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex space-x-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="flex-1"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                disabled={!phoneNumber.trim()}
              >
                Send OTP
              </Button>
            </form>
          )}

          {step === 'verify-phone' && (
            <form onSubmit={handleVerifyPhoneOTP} className="space-y-6">
              <div className="text-center">
                <Smartphone className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-secondary-900">Verify your phone</h2>
                <p className="text-secondary-600 text-sm mt-1">
                  Enter the 6-digit code sent to {countryCode} {phoneNumber}
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter OTP"
                  value={phoneOTP}
                  onChange={(e) => setPhoneOTP(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-600 text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                  disabled={phoneOTP.length !== 6}
                >
                  Verify & Login
                </Button>
                
                <button
                  type="button"
                  onClick={handleResendPhoneOTP}
                  disabled={loading}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {step === 'email' && (
            <form onSubmit={handleSendEmailOTP} className="space-y-6">
              <div className="text-center">
                <Mail className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-secondary-900">Add your email (Optional)</h2>
                <p className="text-secondary-600 text-sm mt-1">
                  You can add your email for better account security
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                  disabled={!email.trim()}
                >
                  Send Email OTP
                </Button>
                
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full text-sm text-secondary-600 hover:text-secondary-700 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </form>
          )}

          {step === 'verify-email' && (
            <form onSubmit={handleVerifyEmailOTP} className="space-y-6">
              <div className="text-center">
                <Mail className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-secondary-900">Verify your email</h2>
                <p className="text-secondary-600 text-sm mt-1">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter OTP"
                  value={emailOTP}
                  onChange={(e) => setEmailOTP(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-600 text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                  disabled={emailOTP.length !== 6}
                >
                  Verify Email
                </Button>
                
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full text-sm text-secondary-600 hover:text-secondary-700 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
