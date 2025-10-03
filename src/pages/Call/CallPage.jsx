import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { callAPI } from '../../utils/api';
import enhancedSocketService from '../../services/enhancedSocketService';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { 
  Phone, 
  Video, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  PhoneOff,
  Volume2,
  VolumeX,
  Settings,
  Users
} from 'lucide-react';

const CallPage = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  
  // WebRTC state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  
  // Call state
  const [callData, setCallData] = useState(null);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, ringing, connected, ended
  const [callType, setCallType] = useState('audio'); // audio, video
  
  // Media controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);

  useEffect(() => {
    if (callId) {
      initializeCall();
    }
    
    setupSocketListeners();
    
    return () => {
      cleanup();
    };
  }, [callId]);

  useEffect(() => {
    let interval;
    if (callStatus === 'connected' && callStartTime) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, callStartTime]);

  const setupSocketListeners = () => {
    enhancedSocketService.on('call_incoming', handleIncomingCall);
    enhancedSocketService.on('call_accepted', handleCallAccepted);
    enhancedSocketService.on('call_rejected', handleCallRejected);
    enhancedSocketService.on('call_ended', handleCallEnded);
    enhancedSocketService.on('webrtc_offer', handleWebRTCOffer);
    enhancedSocketService.on('webrtc_answer', handleWebRTCAnswer);
    enhancedSocketService.on('webrtc_ice_candidate', handleWebRTCIceCandidate);
  };

  const initializeCall = async () => {
    try {
      const response = await callAPI.getCallStatus(callId);
      setCallData(response.data.data.call);
      setCallType(response.data.data.call.type);
      setCallStatus(response.data.data.call.status);
      
      if (response.data.data.call.status === 'connected') {
        await startMedia();
        await initializePeerConnection();
      }
    } catch (error) {
      setError('Failed to initialize call');
    } finally {
      setLoading(false);
    }
  };

  const startMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setError('Failed to access camera/microphone');
    }
  };

  const initializePeerConnection = async () => {
    try {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const pc = new RTCPeerConnection(configuration);
      setPeerConnection(pc);

      // Add local stream to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          enhancedSocketService.sendIceCandidate(callId, event.candidate);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
          setCallStartTime(Date.now());
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          endCall();
        }
      };
    } catch (error) {
      console.error('Error initializing peer connection:', error);
      setError('Failed to initialize call connection');
    }
  };

  const handleIncomingCall = (data) => {
    if (data.callId === callId) {
      setCallData(data.call);
      setCallType(data.call.type);
      setCallStatus('ringing');
    }
  };

  const handleCallAccepted = (data) => {
    if (data.callId === callId) {
      setCallStatus('connected');
      setCallStartTime(Date.now());
    }
  };

  const handleCallRejected = (data) => {
    if (data.callId === callId) {
      setCallStatus('rejected');
      setTimeout(() => navigate('/'), 3000);
    }
  };

  const handleCallEnded = (data) => {
    if (data.callId === callId) {
      setCallStatus('ended');
      setTimeout(() => navigate('/'), 3000);
    }
  };

  const handleWebRTCOffer = async (data) => {
    if (data.callId === callId && peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        enhancedSocketService.sendAnswer(callId, answer);
      } catch (error) {
        console.error('Error handling WebRTC offer:', error);
      }
    }
  };

  const handleWebRTCAnswer = async (data) => {
    if (data.callId === callId && peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (error) {
        console.error('Error handling WebRTC answer:', error);
      }
    }
  };

  const handleWebRTCIceCandidate = async (data) => {
    if (data.callId === callId && peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    }
  };

  const acceptCall = async () => {
    try {
      await callAPI.acceptCall(callId);
      setCallStatus('connected');
      setCallStartTime(Date.now());
      await startMedia();
      await initializePeerConnection();
    } catch (error) {
      setError('Failed to accept call');
    }
  };

  const rejectCall = async () => {
    try {
      await callAPI.rejectCall(callId, 'User rejected the call');
      setCallStatus('rejected');
      setTimeout(() => navigate('/'), 3000);
    } catch (error) {
      setError('Failed to reject call');
    }
  };

  const endCall = async () => {
    try {
      await callAPI.endCall(callId, 'Call ended by user');
      setCallStatus('ended');
      cleanup();
      setTimeout(() => navigate('/'), 3000);
    } catch (error) {
      setError('Failed to end call');
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
    // Implementation for speaker toggle
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Call Error</div>
          <p className="text-secondary-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex flex-col">
      {/* Call Header */}
      <div className="flex items-center justify-between p-6 text-white">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6" />
          <div>
            <h1 className="text-lg font-semibold">
              {callData?.participants?.find(p => p._id !== user._id)?.fullName || 'Unknown User'}
            </h1>
            <p className="text-primary-200 text-sm">
              {callType === 'video' ? 'Video Call' : 'Audio Call'}
            </p>
          </div>
        </div>
        
        {callStatus === 'connected' && (
          <div className="text-center">
            <div className="text-2xl font-mono">{formatDuration(duration)}</div>
            <div className="text-primary-200 text-sm">Call Duration</div>
          </div>
        )}
        
        <Button
          size="small"
          variant="outline"
          onClick={() => navigate('/')}
          className="text-white border-white hover:bg-white hover:text-primary-900"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {callType === 'video' ? (
          <>
            {/* Remote Video */}
            <div className="absolute inset-0">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-secondary-800 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Users className="h-24 w-24 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">Waiting for {callData?.participants?.find(p => p._id !== user._id)?.fullName || 'other participant'}...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video */}
            {localStream && (
              <div className="absolute top-4 right-4 w-48 h-36 bg-secondary-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </>
        ) : (
          /* Audio Call UI */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-48 h-48 mx-auto mb-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Users className="h-24 w-24" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                {callData?.participants?.find(p => p._id !== user._id)?.fullName || 'Unknown User'}
              </h2>
              <p className="text-primary-200">
                {callStatus === 'connected' ? 'Connected' : callStatus === 'ringing' ? 'Ringing...' : 'Connecting...'}
              </p>
            </div>
          </div>
        )}

        {/* Call Status Overlay */}
        {callStatus === 'ringing' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-pulse">
                <Phone className="h-24 w-24 mx-auto mb-4" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Incoming Call</h2>
              <p className="text-lg mb-8">
                {callData?.participants?.find(p => p._id !== user._id)?.fullName || 'Unknown User'}
              </p>
              <div className="flex space-x-4 justify-center">
                <Button
                  size="large"
                  variant="success"
                  onClick={acceptCall}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-6 w-6 mr-2" />
                  Accept
                </Button>
                <Button
                  size="large"
                  variant="danger"
                  onClick={rejectCall}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <PhoneOff className="h-6 w-6 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="p-6">
        <div className="flex items-center justify-center space-x-4">
          <Button
            size="large"
            variant={isMuted ? "danger" : "secondary"}
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {callType === 'video' && (
            <Button
              size="large"
              variant={!isVideoEnabled ? "danger" : "secondary"}
              onClick={toggleVideo}
              className={`w-16 h-16 rounded-full ${
                !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }`}
            >
              {!isVideoEnabled ? <CameraOff className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
            </Button>
          )}

          <Button
            size="large"
            variant="secondary"
            onClick={toggleSpeaker}
            className={`w-16 h-16 rounded-full ${
              isSpeakerEnabled ? 'bg-primary-600 hover:bg-primary-700' : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
          >
            {isSpeakerEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </Button>

          <Button
            size="large"
            variant="danger"
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Hidden audio element for local stream */}
      <audio ref={localAudioRef} autoPlay muted />
    </div>
  );
};

export default CallPage;
