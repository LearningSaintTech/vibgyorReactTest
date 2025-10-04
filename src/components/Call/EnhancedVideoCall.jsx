import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Settings,
  Maximize,
  Minimize
} from 'lucide-react';
import callService from '../../services/enhancedCallService';
import enhancedSocketService from '../../services/enhancedSocketService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';

/**
 * Enhanced Video Call Component with comprehensive WebRTC features
 */
const EnhancedVideoCall = ({ 
  chatId, 
  otherUser, 
  isIncoming = false, 
  incomingCallData = null,
  callId: propCallId = null,
  status: propStatus = null,
  onCallEnd 
}) => {
  const { user } = useAuth();
  
  // State management
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'initiating');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localVideoSize, setLocalVideoSize] = useState('small'); // small, medium, large
  const [pendingSignals, setPendingSignals] = useState({});
  
  // Helper function to queue signals for later processing
  const queueSignal = useCallback((eventType, data) => {
    setPendingSignals((prev) => ({
      ...prev,
      [data.callId]: [...(prev[data.callId] || []), { eventType, data }],
    }));
    console.log(`[VIDEO_CALL] 💾 Queued ${eventType} for call:`, data.callId);
  }, []);
  
  // Update internal call status when prop status changes
  useEffect(() => {
    if (propStatus) {
      console.log('[VIDEO_CALL] 🔄 Updating call status from prop:', propStatus);
      setCallStatus(propStatus);
    }
  }, [propStatus]);

  // Update call ID when props change
  useEffect(() => {
    const newCallId = propCallId || incomingCallData?.callId;
    if (newCallId) {
      console.log('[VIDEO_CALL] 🔄 Call ID updated:', newCallId);
    }
  }, [propCallId, incomingCallData?.callId]);
  
  // Log initial call settings
  useEffect(() => {
    console.log('[VIDEO_CALL] ⚙️ Initial call settings:', {
      isMuted: isMuted,
      isVideoEnabled: isVideoEnabled,
      isScreenSharing: isScreenSharing,
      isSpeakerEnabled: isSpeakerEnabled,
      callStatus: callStatus,
      isIncoming: isIncoming,
      otherUser: otherUser?.username || 'Unknown'
    });
  }, []);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const qualityCheckIntervalRef = useRef(null);
  const isWebRTCSetupRef = useRef(false);
  const currentCallIdRef = useRef(null);
  
  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  // Initialize call
  useEffect(() => {
    const currentCallId = propCallId || incomingCallData?.callId;
    
    if (currentCallId && currentCallId !== currentCallIdRef.current) {
      console.log('[VIDEO_CALL] 🔄 Call ID changed, cleaning up previous connection');
      cleanup();
      currentCallIdRef.current = currentCallId;
      initializeCall();
    }
    
    return () => {
      // Only cleanup on unmount, not on every render
      if (!propCallId && !incomingCallData?.callId) {
        cleanup();
      }
    };
  }, [propCallId, incomingCallData?.callId, isIncoming]);
  
  // Set up socket listeners for signaling (non-persistent, tied to callId changes)
  useEffect(() => {
    const currentCallId = propCallId || incomingCallData?.callId;
    
    if (!currentCallId) {
      console.log('[VIDEO_CALL] ⚠️ No call ID available for socket listeners');
      return;
    }
    
    console.log('[VIDEO_CALL] 🔌 Setting up socket listeners for call:', currentCallId);
    
    // WebRTC signaling event handlers
    const handleWebRTCOffer = (data) => {
      console.log('[VIDEO_CALL] 📡 Received WebRTC offer:', data);
      if (data.callId === currentCallId) {
        handleIncomingOffer(data.offer, currentCallId);
      } else {
        console.log('[VIDEO_CALL] ⚠️ Offer for different call ID, queuing...');
        queueSignal('webrtc_offer', data);
      }
    };
    
    const handleWebRTCAnswer = (data) => {
      console.log('[VIDEO_CALL] 📡 Received WebRTC answer:', data);
      if (data.callId === currentCallId) {
        handleIncomingAnswer(data.answer, currentCallId);
      } else {
        console.log('[VIDEO_CALL] ⚠️ Answer for different call ID, queuing...');
        queueSignal('webrtc_answer', data);
      }
    };
    
    const handleWebRTCCandidate = (data) => {
      console.log('[VIDEO_CALL] 📡 Received WebRTC ICE candidate:', data);
      if (data.callId === currentCallId) {
        handleIncomingIceCandidate(data.candidate, currentCallId);
      } else {
        console.log('[VIDEO_CALL] ⚠️ ICE candidate for different call ID, queuing...');
        queueSignal('webrtc_ice_candidate', data);
      }
    };
    
    // Register event listeners
    enhancedSocketService.on('webrtc_offer', handleWebRTCOffer);
    enhancedSocketService.on('webrtc_answer', handleWebRTCAnswer);
    enhancedSocketService.on('webrtc_ice_candidate', handleWebRTCCandidate);
    
    // Process any pending signals for this call
    const pendingCallSignals = pendingSignals[currentCallId] || [];
    console.log('[VIDEO_CALL] 🔄 Processing', pendingCallSignals.length, 'pending signals for call:', currentCallId);
    
    pendingCallSignals.forEach(({ eventType, data }) => {
      console.log('[VIDEO_CALL] 🔄 Processing pending signal:', eventType);
      switch (eventType) {
        case 'webrtc_offer':
          handleIncomingOffer(data.offer, currentCallId);
          break;
        case 'webrtc_answer':
          handleIncomingAnswer(data.answer, currentCallId);
          break;
        case 'webrtc_ice_candidate':
          handleIncomingIceCandidate(data.candidate, currentCallId);
          break;
      }
    });
    
    // Clear processed signals
    if (pendingCallSignals.length > 0) {
      setPendingSignals(prev => {
        const updated = { ...prev };
        delete updated[currentCallId];
        return updated;
      });
    }
    
    // Cleanup function
    return () => {
      console.log('[VIDEO_CALL] 🧹 Cleaning up socket listeners for call:', currentCallId);
      enhancedSocketService.off('webrtc_offer', handleWebRTCOffer);
      enhancedSocketService.off('webrtc_answer', handleWebRTCAnswer);
      enhancedSocketService.off('webrtc_ice_candidate', handleWebRTCCandidate);
    };
  }, [propCallId, incomingCallData?.callId, queueSignal, pendingSignals]);

  // Update call duration
  useEffect(() => {
    if (callStatus === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const initializeCall = async () => {
    try {
      const currentCallId = propCallId || incomingCallData?.callId;
      
      if (!currentCallId) {
        throw new Error('Call ID is required');
      }

      // Get call status from server
      const callStatusResult = await callService.getCallStatus(currentCallId);
      
      if (callStatusResult.success) {
        const call = callStatusResult.call;
        setCallStatus(call.status);
        
        // Initialize WebRTC based on call status
        if (call.status === 'connected' || call.status === 'ringing') {
          await setupWebRTC(currentCallId);
          
          if (call.status === 'ringing' && !isIncoming) {
            // We initiated the call, create offer
            await createOffer(currentCallId);
          } else if (call.status === 'ringing' && isIncoming && call.webrtcData?.offer) {
            // We received the call, process the offer
            await handleIncomingOffer(call.webrtcData.offer, currentCallId);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing call:', error);
      setError(error.message || 'Failed to initialize call');
      setCallStatus('failed');
    }
  };

  const setupWebRTC = async (callId) => {
    try {
      // Prevent multiple WebRTC setups
      if (isWebRTCSetupRef.current && peerConnectionRef.current) {
        console.log('[VIDEO_CALL] ⚠️ WebRTC already set up, skipping...');
        return;
      }
      
      console.log('[VIDEO_CALL] 🔧 Setting up WebRTC for call:', callId);
      
      // Clean up any existing connection
      if (peerConnectionRef.current) {
        console.log('[VIDEO_CALL] 🧹 Cleaning up existing peer connection');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Create new peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
      console.log('[VIDEO_CALL] ✅ New peer connection created');
      
      // Get user media only if not already obtained
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        
        console.log('[VIDEO_CALL] 🎥 Video stream obtained:', {
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          audioTrackEnabled: stream.getAudioTracks()[0]?.enabled,
          videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
          audioTrackMuted: stream.getAudioTracks()[0]?.muted,
          videoTrackMuted: stream.getVideoTracks()[0]?.muted
        });
        
        localStreamRef.current = stream;
        
        // Set up video elements
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Mute local audio to prevent feedback
        }
      }
      
      // Add tracks to peer connection
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
      
      console.log('[VIDEO_CALL] ✅ Tracks added to peer connection');
      
      // Set up peer connection event handlers
      peerConnectionRef.current.ontrack = (event) => {
        console.log('[VIDEO_CALL] 📺 Received remote track');
        const [remoteStream] = event.streams;
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };
      
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          handleIceCandidate(event.candidate, callId);
        }
      };
      
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('[VIDEO_CALL] 🔗 Connection state:', state);
        
        if (state === 'connected') {
          setCallStatus('connected');
          startQualityMonitoring();
        } else if (state === 'disconnected' || state === 'failed') {
          setCallStatus('failed');
          setError('Connection lost');
        }
      };
      
      peerConnectionRef.current.onsignalingstatechange = () => {
        const state = peerConnectionRef.current.signalingState;
        console.log('[VIDEO_CALL] 📡 Signaling state:', state);
      };
      
      peerConnectionRef.current.onicegatheringstatechange = () => {
        const state = peerConnectionRef.current.iceGatheringState;
        console.log('[VIDEO_CALL] 🧊 ICE gathering state:', state);
      };
      
      isWebRTCSetupRef.current = true;
      
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error setting up WebRTC:', error);
      setError(error.message || 'Failed to setup call');
      setCallStatus('failed');
    }
  };

  const createOffer = async (callId) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }
      
      // Check if we already have a local description (prevent multiple offers)
      if (peerConnectionRef.current.localDescription) {
        console.log('[VIDEO_CALL] ⚠️ Offer already created, skipping...');
        return;
      }
      
      console.log('[VIDEO_CALL] 📤 Creating offer for call:', callId);
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('[VIDEO_CALL] 📤 Offer created:', {
        type: offer.type,
        sdp: offer.sdp.substring(0, 100) + '...',
        mLineCount: (offer.sdp.match(/^m=/gm) || []).length
      });
      
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('[VIDEO_CALL] 📤 Local description set');
      
      // Send offer to server
      await callService.sendOffer(callId, offer);
      console.log('[VIDEO_CALL] 📤 Offer sent to server');
      
      setCallStatus('ringing');
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error creating offer:', error);
      setError(error.message || 'Failed to create offer');
      setCallStatus('failed');
    }
  };

  const handleIncomingOffer = async (offer, callId) => {
    try {
      console.log('[VIDEO_CALL] 📥 Handling incoming offer for call:', callId);
      
      if (!peerConnectionRef.current) {
        console.log('[VIDEO_CALL] 📥 Setting up WebRTC for incoming call');
        await setupWebRTC(callId);
      }
      
      // Check if we already have a remote description (prevent duplicate processing)
      if (peerConnectionRef.current.remoteDescription) {
        console.log('[VIDEO_CALL] ⚠️ Remote description already set, skipping...');
        return;
      }
      
      console.log('[VIDEO_CALL] 📥 Setting remote description:', {
        type: offer.type,
        sdp: offer.sdp.substring(0, 100) + '...',
        mLineCount: (offer.sdp.match(/^m=/gm) || []).length
      });
      
      await peerConnectionRef.current.setRemoteDescription(offer);
      console.log('[VIDEO_CALL] 📥 Remote description set successfully');
      
      console.log('[VIDEO_CALL] 📥 Creating answer');
      const answer = await peerConnectionRef.current.createAnswer();
      
      console.log('[VIDEO_CALL] 📥 Answer created:', {
        type: answer.type,
        sdp: answer.sdp.substring(0, 100) + '...',
        mLineCount: (answer.sdp.match(/^m=/gm) || []).length
      });
      
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log('[VIDEO_CALL] 📥 Local description set');
      
      // Send answer to server
      await callService.sendAnswer(callId, answer);
      console.log('[VIDEO_CALL] 📥 Answer sent to server');
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error handling incoming offer:', error);
      setError(error.message || 'Failed to handle incoming offer');
      setCallStatus('failed');
    }
  };

  const handleIncomingAnswer = async (answer, callId) => {
    try {
      console.log('[VIDEO_CALL] 📥 Handling incoming answer for call:', callId);
      
      if (!peerConnectionRef.current) {
        console.log('[VIDEO_CALL] ⚠️ No peer connection available for answer');
        return;
      }
      
      // Check if we already have a remote description (prevent duplicate processing)
      if (peerConnectionRef.current.remoteDescription) {
        console.log('[VIDEO_CALL] ⚠️ Remote description already set, skipping answer...');
        return;
      }
      
      console.log('[VIDEO_CALL] 📥 Setting remote description (answer):', {
        type: answer.type,
        sdp: answer.sdp.substring(0, 100) + '...',
        mLineCount: (answer.sdp.match(/^m=/gm) || []).length
      });
      
      await peerConnectionRef.current.setRemoteDescription(answer);
      console.log('[VIDEO_CALL] 📥 Remote description (answer) set successfully');
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error handling incoming answer:', error);
      setError(error.message || 'Failed to handle incoming answer');
      setCallStatus('failed');
    }
  };

  const handleIncomingIceCandidate = async (candidate, callId) => {
    try {
      console.log('[VIDEO_CALL] 📥 Handling incoming ICE candidate for call:', callId);
      
      if (!peerConnectionRef.current) {
        console.log('[VIDEO_CALL] ⚠️ No peer connection available for ICE candidate');
        return;
      }
      
      await peerConnectionRef.current.addIceCandidate(candidate);
      console.log('[VIDEO_CALL] 📥 ICE candidate added successfully');
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error handling incoming ICE candidate:', error);
    }
  };

  const handleIceCandidate = async (candidate, callId) => {
    try {
      await callService.sendIceCandidate(callId, candidate);
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error sending ICE candidate:', error);
    }
  };

  const acceptCall = async () => {
    try {
      const currentCallId = propCallId || incomingCallData?.callId;
      
      if (!currentCallId) {
        throw new Error('Call ID is required');
      }
      
      const result = await callService.acceptCall(currentCallId);
      
      if (result.success) {
        setCallStatus('connected');
        
        // Process any pending offer
        if (incomingCallData?.signalingData?.offer) {
          await handleIncomingOffer(incomingCallData.signalingData.offer, currentCallId);
        }
      }
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error accepting call:', error);
      
      // If the error is about call not being in ringing state, it might already be connected
      if (error.message && error.message.includes('not in ringing state')) {
        console.log('[VIDEO_CALL] 📞 Call already connected, updating status');
        setCallStatus('connected');
        
        // Process any pending offer
        if (incomingCallData?.signalingData?.offer) {
          await handleIncomingOffer(incomingCallData.signalingData.offer, currentCallId);
        }
      } else {
        setError(error.message || 'Failed to accept call');
        setCallStatus('failed');
      }
    }
  };

  const rejectCall = async () => {
    try {
      const currentCallId = propCallId || incomingCallData?.callId;
      
      if (currentCallId) {
        await callService.rejectCall(currentCallId, 'User rejected');
      }
      
      setCallStatus('rejected');
      if (onCallEnd) {
        onCallEnd();
      }
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error rejecting call:', error);
      setCallStatus('rejected');
      if (onCallEnd) {
        onCallEnd();
      }
    }
  };

  const endCall = async () => {
    try {
      const currentCallId = propCallId || incomingCallData?.callId;
      
      if (currentCallId) {
        await callService.endCall(currentCallId, 'user_ended');
      }
      
      setCallStatus('ended');
      cleanup();
      
      if (onCallEnd) {
        onCallEnd();
      }
    } catch (error) {
      console.error('[VIDEO_CALL] ❌ Error ending call:', error);
      setCallStatus('ended');
      cleanup();
      
      if (onCallEnd) {
        onCallEnd();
      }
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const wasEnabled = audioTrack.enabled;
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        console.log('[VIDEO_CALL] 🔇 Mute toggle:', {
          wasEnabled,
          nowEnabled: audioTrack.enabled,
          isMuted: !audioTrack.enabled,
          trackMuted: audioTrack.muted,
          trackKind: audioTrack.kind
        });
        
        // Update call settings
        const currentCallId = propCallId || incomingCallData?.callId;
        if (currentCallId) {
          callService.updateCallSettings(currentCallId, {
            isMuted: !audioTrack.enabled
          });
        }
      }
    }
  };

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const wasEnabled = videoTrack.enabled;
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        console.log('[VIDEO_CALL] 📹 Video toggle:', {
          wasEnabled,
          nowEnabled: videoTrack.enabled,
          isVideoEnabled: videoTrack.enabled,
          trackMuted: videoTrack.muted,
          trackKind: videoTrack.kind
        });
        
        // Update call settings
        const currentCallId = propCallId || incomingCallData?.callId;
        if (currentCallId) {
          callService.updateCallSettings(currentCallId, {
            isVideoEnabled: videoTrack.enabled
          });
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        
        // Replace with camera
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        
        const videoTrack = stream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        localStreamRef.current = stream;
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      }
      
      // Update call settings
      const currentCallId = propCallId || incomingCallData?.callId;
      if (currentCallId) {
        callService.updateCallSettings(currentCallId, {
          isScreenSharing: !isScreenSharing
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setError(error.message || 'Failed to toggle screen share');
    }
  };

  const toggleSpeaker = () => {
    const newSpeakerState = !isSpeakerEnabled;
    setIsSpeakerEnabled(newSpeakerState);
    
    console.log('[VIDEO_CALL] 🔊 Speaker toggle:', {
      wasEnabled: isSpeakerEnabled,
      nowEnabled: newSpeakerState,
      remoteVideoMuted: newSpeakerState
    });
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = newSpeakerState;
      console.log('[VIDEO_CALL] 🔊 Remote video element updated:', {
        muted: remoteVideoRef.current.muted,
        readyState: remoteVideoRef.current.readyState
      });
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const startQualityMonitoring = () => {
    qualityCheckIntervalRef.current = setInterval(async () => {
      if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'connected') {
        try {
          const stats = await peerConnectionRef.current.getStats();
          let videoBitrate = 0;
          let audioBitrate = 0;
          let packetLoss = 0;
          
          stats.forEach(report => {
            if (report.type === 'inbound-rtp') {
              if (report.mediaType === 'video') {
                videoBitrate = report.bytesReceived * 8 / 1000; // kbps
              } else if (report.mediaType === 'audio') {
                audioBitrate = report.bytesReceived * 8 / 1000; // kbps
              }
              packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost) * 100;
            }
          });
          
          // Determine connection quality
          if (packetLoss < 1 && videoBitrate > 500) {
            setConnectionQuality('excellent');
          } else if (packetLoss < 3 && videoBitrate > 300) {
            setConnectionQuality('good');
          } else if (packetLoss < 5 && videoBitrate > 200) {
            setConnectionQuality('fair');
          } else {
            setConnectionQuality('poor');
          }
        } catch (error) {
          console.error('Error checking connection quality:', error);
        }
      }
    }, 5000); // Check every 5 seconds
  };

  const cleanup = () => {
    console.log('[VIDEO_CALL] 🧹 Starting cleanup...');
    
    // Stop all tracks
    if (localStreamRef.current) {
      console.log('[VIDEO_CALL] 🧹 Stopping local stream tracks');
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[VIDEO_CALL] 🧹 Stopping track:', track.kind, track.label);
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      console.log('[VIDEO_CALL] 🧹 Stopping screen stream tracks');
      screenStreamRef.current.getTracks().forEach(track => {
        console.log('[VIDEO_CALL] 🧹 Stopping screen track:', track.kind, track.label);
        track.stop();
      });
      screenStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      console.log('[VIDEO_CALL] 🧹 Closing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear intervals
    if (durationIntervalRef.current) {
      console.log('[VIDEO_CALL] 🧹 Clearing duration interval');
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (qualityCheckIntervalRef.current) {
      console.log('[VIDEO_CALL] 🧹 Clearing quality check interval');
      clearInterval(qualityCheckIntervalRef.current);
      qualityCheckIntervalRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      console.log('[VIDEO_CALL] 🧹 Clearing local video element');
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      console.log('[VIDEO_CALL] 🧹 Clearing remote video element');
      remoteVideoRef.current.srcObject = null;
    }
    
    // Reset WebRTC setup flag
    isWebRTCSetupRef.current = false;
    currentCallIdRef.current = null;
    
    console.log('[VIDEO_CALL] 🧹 Cleanup completed');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'initiating':
        return 'Connecting...';
      case 'ringing':
        return isIncoming ? 'Incoming call' : 'Calling...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      case 'rejected':
        return 'Call rejected';
      case 'failed':
        return 'Call failed';
      default:
        return 'Unknown status';
    }
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-green-400';
      case 'fair':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!chatId || !otherUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Invalid call parameters</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-black text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-900/80 border border-red-700 rounded-lg p-4 z-10">
          <p className="text-red-100 text-sm">{error}</p>
        </div>
      )}

      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Local Video */}
        <div className={`absolute top-4 right-4 bg-gray-900 rounded-lg overflow-hidden shadow-lg ${
          localVideoSize === 'small' ? 'w-32 h-24' :
          localVideoSize === 'medium' ? 'w-48 h-36' :
          'w-64 h-48'
        }`}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Video size toggle */}
          <button
            onClick={() => {
              setLocalVideoSize(
                localVideoSize === 'small' ? 'medium' :
                localVideoSize === 'medium' ? 'large' : 'small'
              );
            }}
            className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded"
          >
            {localVideoSize}
          </button>
        </div>

        {/* Call Info Overlay */}
        <div className="absolute top-4 left-4 bg-black/50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-1">
            {otherUser.fullName || otherUser.username}
          </h2>
          <p className="text-sm text-gray-300">
            {getStatusText()}
          </p>
          {callStatus === 'connected' && (
            <p className={`text-xs mt-1 ${getConnectionQualityColor()}`}>
              Connection: {connectionQuality}
            </p>
          )}
        </div>

        {/* Loading State */}
        {(callStatus === 'initiating' || callStatus === 'ringing') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-lg">{getStatusText()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center space-x-6 p-6 bg-black/50">
        {/* Mute/Unmute */}
        <Button
          variant={isMuted ? "destructive" : "outline"}
          size="lg"
          onClick={toggleMute}
          className="w-16 h-16 rounded-full bg-black/50 border-white/20 hover:bg-black/70"
          disabled={callStatus !== 'connected'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        {/* Video Toggle */}
        <Button
          variant={isVideoEnabled ? "outline" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className="w-16 h-16 rounded-full bg-black/50 border-white/20 hover:bg-black/70"
          disabled={callStatus !== 'connected'}
        >
          {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        {/* Screen Share */}
        <Button
          variant={isScreenSharing ? "primary" : "outline"}
          size="lg"
          onClick={toggleScreenShare}
          className="w-16 h-16 rounded-full bg-black/50 border-white/20 hover:bg-black/70"
          disabled={callStatus !== 'connected'}
        >
          {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
        </Button>

        {/* Speaker */}
        <Button
          variant={isSpeakerEnabled ? "outline" : "secondary"}
          size="lg"
          onClick={toggleSpeaker}
          className="w-16 h-16 rounded-full bg-black/50 border-white/20 hover:bg-black/70"
          disabled={callStatus !== 'connected'}
        >
          {isSpeakerEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </Button>

        {/* End Call */}
        <Button
          variant="destructive"
          size="lg"
          onClick={endCall}
          className="w-16 h-16 rounded-full"
          disabled={callStatus === 'ended'}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>

        {/* Accept Call (for incoming calls) */}
        {isIncoming && callStatus === 'incoming' && (
          <Button
            variant="primary"
            size="lg"
            onClick={acceptCall}
            className="w-16 h-16 rounded-full"
          >
            <Phone className="w-6 h-6" />
          </Button>
        )}

        {/* Reject Call (for incoming calls) */}
        {isIncoming && callStatus === 'incoming' && (
          <Button
            variant="destructive"
            size="lg"
            onClick={rejectCall}
            className="w-16 h-16 rounded-full"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        )}

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="lg"
          onClick={toggleFullscreen}
          className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70"
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setShowSettings(!showSettings)}
          className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-20 right-6 bg-black/80 rounded-lg p-4 min-w-[200px] border border-white/20">
          <h3 className="text-sm font-medium mb-3">Call Settings</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mute</span>
              <button
                onClick={toggleMute}
                className={`w-10 h-6 rounded-full transition-colors ${
                  isMuted ? 'bg-red-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    isMuted ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Video</span>
              <button
                onClick={toggleVideo}
                className={`w-10 h-6 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    isVideoEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Screen Share</span>
              <button
                onClick={toggleScreenShare}
                className={`w-10 h-6 rounded-full transition-colors ${
                  isScreenSharing ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    isScreenSharing ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Speaker</span>
              <button
                onClick={toggleSpeaker}
                className={`w-10 h-6 rounded-full transition-colors ${
                  isSpeakerEnabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    isSpeakerEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoCall;
