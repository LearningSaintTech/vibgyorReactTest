import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Settings,
  MoreVertical
} from 'lucide-react';
import callService from '../../services/enhancedCallService';
import enhancedSocketService from '../../services/enhancedSocketService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';

/**
 * Enhanced Audio Call Component with comprehensive WebRTC features
 */
const EnhancedAudioCall = ({ 
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
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingSignals, setPendingSignals] = useState({});
  
  // Helper function to queue signals for later processing
  const queueSignal = useCallback((eventType, data) => {
    setPendingSignals((prev) => ({
      ...prev,
      [data.callId]: [...(prev[data.callId] || []), { eventType, data }],
    }));
    console.log(`[AUDIO_CALL] 💾 Queued ${eventType} for call:`, data.callId);
  }, []);
  
  // Update internal call status when prop status changes
  useEffect(() => {
    if (propStatus) {
      console.log('[AUDIO_CALL] 🔄 Updating call status from prop:', propStatus);
      setCallStatus(propStatus);
    }
  }, [propStatus]);

  // Update call ID when props change
  useEffect(() => {
    const newCallId = propCallId || incomingCallData?.callId;
    if (newCallId) {
      console.log('[AUDIO_CALL] 🔄 Call ID updated:', newCallId);
    }
  }, [propCallId, incomingCallData?.callId]);
  
  // Log initial call settings
  useEffect(() => {
    console.log('[AUDIO_CALL] ⚙️ Initial call settings:', {
      isMuted: isMuted,
      isSpeakerEnabled: isSpeakerEnabled,
      callStatus: callStatus,
      isIncoming: isIncoming,
      otherUser: otherUser?.username || 'Unknown'
    });
  }, []);
  
  // Refs
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
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
      console.log('[AUDIO_CALL] 🔄 Call ID changed, cleaning up previous connection');
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
      console.log('[AUDIO_CALL] ⚠️ No call ID, skipping listener setup');
      return;
    }

    console.log('[AUDIO_CALL] 🔌 Registering WebRTC socket listeners for call ID:', currentCallId);

    // Define handlers with callId check
    const handleIncomingOfferEvent = (data) => {
      console.log('[AUDIO_CALL] 📥 Received offer event:', data);
      if (data.callId === currentCallId || callStatus === 'connected' || callStatus === 'ringing') {
        console.log('[AUDIO_CALL] 📥 Processing offer for call:', data.callId);
        if (data.offer) {
          handleIncomingOffer(data.offer, data.callId);
        }
      } else {
        console.log('[AUDIO_CALL] 📥 Queuing offer - call ID mismatch:', {
          eventCallId: data.callId,
          currentCallId,
        });
        queueSignal('offer', data);
      }
    };

    const handleIncomingAnswer = (data) => {
      console.log('[AUDIO_CALL] 📥 Received answer event:', data);
      if (data.callId === currentCallId || callStatus === 'connected' || callStatus === 'ringing') {
        console.log('[AUDIO_CALL] 📥 Processing answer for call:', data.callId);
        if (peerConnectionRef.current && data.answer && !peerConnectionRef.current.remoteDescription) {
          console.log('[AUDIO_CALL] 📥 Setting remote description from answer:', {
            type: data.answer.type,
            sdp: data.answer.sdp.substring(0, 100) + '...',
            mLineCount: (data.answer.sdp.match(/^m=/gm) || []).length
          });
          peerConnectionRef.current.setRemoteDescription(data.answer).catch((error) => {
            console.error('[AUDIO_CALL] ❌ Error setting remote description:', error);
          });
        }
      } else {
        console.log('[AUDIO_CALL] 📥 Queuing answer - call ID mismatch:', {
          eventCallId: data.callId,
          currentCallId,
        });
        queueSignal('answer', data);
      }
    };

    const handleIncomingIceCandidate = (data) => {
      console.log('[AUDIO_CALL] 🧊 Received ICE candidate event:', data);
      if (data.callId === currentCallId || callStatus === 'connected' || callStatus === 'ringing') {
        console.log('[AUDIO_CALL] 🧊 Processing ICE candidate for call:', data.callId);
        if (peerConnectionRef.current && data.candidate) {
          peerConnectionRef.current.addIceCandidate(data.candidate).catch((error) => {
            console.error('[AUDIO_CALL] ❌ Error adding ICE candidate:', error);
          });
        }
      } else {
        console.log('[AUDIO_CALL] 🧊 Queuing ICE candidate - call ID mismatch:', {
          eventCallId: data.callId,
          currentCallId,
        });
        queueSignal('ice-candidate', data);
      }
    };

    // Register listeners
    enhancedSocketService.on('webrtc_offer', handleIncomingOfferEvent);
    enhancedSocketService.on('webrtc_answer', handleIncomingAnswer);
    enhancedSocketService.on('webrtc_ice_candidate', handleIncomingIceCandidate);
    enhancedSocketService.on('webrtc:offer', handleIncomingOfferEvent);
    enhancedSocketService.on('webrtc:answer', handleIncomingAnswer);
    enhancedSocketService.on('webrtc:ice-candidate', handleIncomingIceCandidate);

    // Debug listener state
    setTimeout(() => {
      console.log('[AUDIO_CALL] 🔍 Checking listeners after registration...');
      enhancedSocketService.getListenersDebugInfo();
    }, 100);

    // Cleanup listeners on unmount or callId change
    return () => {
      console.log('[AUDIO_CALL] 🧹 Removing WebRTC socket listeners for call ID:', currentCallId);
      enhancedSocketService.off('webrtc_offer', handleIncomingOfferEvent);
      enhancedSocketService.off('webrtc_answer', handleIncomingAnswer);
      enhancedSocketService.off('webrtc_ice_candidate', handleIncomingIceCandidate);
      enhancedSocketService.off('webrtc:offer', handleIncomingOfferEvent);
      enhancedSocketService.off('webrtc:answer', handleIncomingAnswer);
      enhancedSocketService.off('webrtc:ice-candidate', handleIncomingIceCandidate);
      console.log('[AUDIO_CALL] ✅ WebRTC socket listeners removed');
    };
  }, [propCallId, incomingCallData?.callId, callStatus, queueSignal]); // Re-run on callId or callStatus change

  // Process queued signals when callId updates
  useEffect(() => {
    const currentCallId = propCallId || incomingCallData?.callId;
    if (currentCallId && pendingSignals[currentCallId]) {
      console.log('[AUDIO_CALL] 🔄 Processing queued signals for call:', currentCallId);
      pendingSignals[currentCallId].forEach(({ eventType, data }) => {
        if (eventType === 'offer' && data.offer) {
          handleIncomingOffer(data.offer, data.callId);
        } else if (eventType === 'answer' && data.answer && peerConnectionRef.current) {
          peerConnectionRef.current.setRemoteDescription(data.answer).catch((error) => {
            console.error('[AUDIO_CALL] ❌ Error processing queued answer:', error);
          });
        } else if (eventType === 'ice-candidate' && data.candidate && peerConnectionRef.current) {
          peerConnectionRef.current.addIceCandidate(data.candidate).catch((error) => {
            console.error('[AUDIO_CALL] ❌ Error processing queued ICE candidate:', error);
          });
        }
      });
      setPendingSignals((prev) => ({ ...prev, [currentCallId]: [] }));
    }
  }, [propCallId, incomingCallData?.callId, pendingSignals]);

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
        console.log('[AUDIO_CALL] ⚠️ WebRTC already set up, skipping...');
        return;
      }
      
      console.log('[AUDIO_CALL] 🔧 Setting up WebRTC for call:', callId);
      
      // Clean up any existing connection
      if (peerConnectionRef.current) {
        console.log('[AUDIO_CALL] 🧹 Cleaning up existing peer connection');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Create new peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
      console.log('[AUDIO_CALL] ✅ New peer connection created');
      
      // Get user media only if not already obtained
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        console.log('[AUDIO_CALL] 🎤 Audio stream obtained:', {
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
          trackEnabled: stream.getAudioTracks()[0]?.enabled,
          trackMuted: stream.getAudioTracks()[0]?.muted,
          trackKind: stream.getAudioTracks()[0]?.kind,
          trackLabel: stream.getAudioTracks()[0]?.label
        });
        
        localStreamRef.current = stream;
        
        // Set up audio elements
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
          localAudioRef.current.muted = true; // Mute local audio to prevent feedback
        }
      }
      
      // Add tracks to peer connection
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
      
      console.log('[AUDIO_CALL] ✅ Tracks added to peer connection');
      
      // Mark WebRTC as set up
      isWebRTCSetupRef.current = true;
      
      // Set up peer connection event handlers
      peerConnectionRef.current.ontrack = (event) => {
          console.log('[AUDIO_CALL] 🎧 Received remote track:', {
            streamId: event.streams[0]?.id,
            audioTracks: event.streams[0]?.getAudioTracks().length,
            trackEnabled: event.streams[0]?.getAudioTracks()[0]?.enabled,
            trackMuted: event.streams[0]?.getAudioTracks()[0]?.muted,
            trackKind: event.streams[0]?.getAudioTracks()[0]?.kind,
            trackLabel: event.streams[0]?.getAudioTracks()[0]?.label
          });
          const [remoteStream] = event.streams;
          
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            console.log('[AUDIO_CALL] 🎧 Remote audio element configured:', {
              srcObject: !!remoteAudioRef.current.srcObject,
              muted: remoteAudioRef.current.muted,
              readyState: remoteAudioRef.current.readyState,
              volume: remoteAudioRef.current.volume,
              currentTime: remoteAudioRef.current.currentTime
            });
            
            // Try to play the remote audio
            remoteAudioRef.current.play().then(() => {
              console.log('[AUDIO_CALL] 🎧 Remote audio playing successfully');
            }).catch(error => {
              console.error('[AUDIO_CALL] 🎧 Error playing remote audio:', error);
            });
            
            // Add event listeners to monitor audio playback
            remoteAudioRef.current.addEventListener('loadedmetadata', () => {
              console.log('[AUDIO_CALL] 🎧 Remote audio metadata loaded');
            });
            
            remoteAudioRef.current.addEventListener('canplay', () => {
              console.log('[AUDIO_CALL] 🎧 Remote audio can play');
            });
            
            remoteAudioRef.current.addEventListener('playing', () => {
              console.log('[AUDIO_CALL] 🎧 Remote audio is playing');
            });
            
            remoteAudioRef.current.addEventListener('error', (e) => {
              console.error('[AUDIO_CALL] 🎧 Remote audio error:', e);
            });
          }
        };
      
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[AUDIO_CALL] 🧊 ICE candidate generated:', {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          });
          handleIceCandidate(event.candidate, callId);
        } else {
          console.log('[AUDIO_CALL] 🧊 ICE candidate gathering complete');
        }
      };
      
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('[AUDIO_CALL] 🔗 Connection state changed:', state);
        
        if (state === 'connected') {
          console.log('[AUDIO_CALL] ✅ Call connected - Audio settings:', {
            isMuted: isMuted,
            isSpeakerEnabled: isSpeakerEnabled,
            localAudioMuted: localAudioRef.current?.muted,
            remoteAudioMuted: remoteAudioRef.current?.muted,
            localStreamTracks: localStreamRef.current?.getAudioTracks().length,
            remoteStreamTracks: remoteAudioRef.current?.srcObject?.getAudioTracks().length,
            localStreamId: localStreamRef.current?.id,
            remoteStreamId: remoteAudioRef.current?.srcObject?.id
          });
          setCallStatus('connected');
          startQualityMonitoring();
        } else if (state === 'disconnected' || state === 'failed') {
          console.log('[AUDIO_CALL] ❌ Connection lost:', state);
          setCallStatus('failed');
          setError('Connection lost');
        } else if (state === 'connecting') {
          console.log('[AUDIO_CALL] 🔄 Connection in progress...');
        } else if (state === 'new') {
          console.log('[AUDIO_CALL] 🆕 New connection state');
        }
      };
      
      peerConnectionRef.current.onsignalingstatechange = () => {
        const state = peerConnectionRef.current.signalingState;
        console.log('[AUDIO_CALL] 📡 Signaling state:', state);
      };
      
      peerConnectionRef.current.oniceconnectionstatechange = () => {
        const state = peerConnectionRef.current.iceConnectionState;
        console.log('[AUDIO_CALL] 🧊 ICE connection state:', state);
      };
      
      peerConnectionRef.current.onicegatheringstatechange = () => {
        const state = peerConnectionRef.current.iceGatheringState;
        console.log('[AUDIO_CALL] 🧊 ICE gathering state:', state);
      };
      
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
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
        console.log('[AUDIO_CALL] ⚠️ Offer already created, skipping...');
        return;
      }
      
      console.log('[AUDIO_CALL] 📤 Creating offer for call:', callId);
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      console.log('[AUDIO_CALL] 📤 Offer created:', {
        type: offer.type,
        sdp: offer.sdp.substring(0, 100) + '...',
        mLineCount: (offer.sdp.match(/^m=/gm) || []).length
      });
      
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('[AUDIO_CALL] 📤 Local description set');
      
      // Send offer to server
      await callService.sendOffer(callId, offer);
      console.log('[AUDIO_CALL] 📤 Offer sent to server');
      
      setCallStatus('ringing');
    } catch (error) {
      console.error('[AUDIO_CALL] ❌ Error creating offer:', error);
      setError(error.message || 'Failed to create offer');
      setCallStatus('failed');
    }
  };

  const handleIncomingOffer = async (offer, callId) => {
    try {
      console.log('[AUDIO_CALL] 📥 Handling incoming offer for call:', callId);
      
      if (!peerConnectionRef.current) {
        console.log('[AUDIO_CALL] 📥 Setting up WebRTC for incoming call');
        await setupWebRTC(callId);
      }
      
      // Check if we already have a remote description (prevent duplicate processing)
      if (peerConnectionRef.current.remoteDescription) {
        console.log('[AUDIO_CALL] ⚠️ Remote description already set, skipping...');
        return;
      }
      
      console.log('[AUDIO_CALL] 📥 Setting remote description:', {
        type: offer.type,
        sdp: offer.sdp.substring(0, 100) + '...',
        mLineCount: (offer.sdp.match(/^m=/gm) || []).length
      });
      
      await peerConnectionRef.current.setRemoteDescription(offer);
      console.log('[AUDIO_CALL] 📥 Remote description set successfully');
      
      console.log('[AUDIO_CALL] 📥 Creating answer');
      const answer = await peerConnectionRef.current.createAnswer();
      
      console.log('[AUDIO_CALL] 📥 Answer created:', {
        type: answer.type,
        sdp: answer.sdp.substring(0, 100) + '...',
        mLineCount: (answer.sdp.match(/^m=/gm) || []).length
      });
      
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log('[AUDIO_CALL] 📥 Local description set');
      
      // Send answer to server
      await callService.sendAnswer(callId, answer);
      console.log('[AUDIO_CALL] 📥 Answer sent to server');
    } catch (error) {
      console.error('[AUDIO_CALL] ❌ Error handling incoming offer:', error);
      setError(error.message || 'Failed to handle incoming offer');
      setCallStatus('failed');
    }
  };

  const handleIceCandidate = async (candidate, callId) => {
    try {
      await callService.sendIceCandidate(callId, candidate);
    } catch (error) {
      console.error('Error sending ICE candidate:', error);
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
      console.error('Error accepting call:', error);
      setError(error.message || 'Failed to accept call');
      setCallStatus('failed');
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
      console.error('Error rejecting call:', error);
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
      console.error('Error ending call:', error);
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
        
        console.log('[AUDIO_CALL] 🔇 Mute toggle:', {
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

  const toggleSpeaker = () => {
    const newSpeakerState = !isSpeakerEnabled;
    setIsSpeakerEnabled(newSpeakerState);
    
    console.log('[AUDIO_CALL] 🔊 Speaker toggle:', {
      wasEnabled: isSpeakerEnabled,
      nowEnabled: newSpeakerState,
      remoteAudioMuted: newSpeakerState
    });
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = newSpeakerState;
      console.log('[AUDIO_CALL] 🔊 Remote audio element updated:', {
        muted: remoteAudioRef.current.muted,
        readyState: remoteAudioRef.current.readyState
      });
    }
  };

  const startQualityMonitoring = () => {
    qualityCheckIntervalRef.current = setInterval(async () => {
      if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'connected') {
        try {
          const stats = await peerConnectionRef.current.getStats();
          let audioLevel = 0;
          let packetLoss = 0;
          
          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
              audioLevel = report.audioLevel || 0;
              packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost) * 100;
            }
          });
          
          // Determine connection quality
          if (packetLoss < 1) {
            setConnectionQuality('excellent');
          } else if (packetLoss < 3) {
            setConnectionQuality('good');
          } else if (packetLoss < 5) {
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
    console.log('[AUDIO_CALL] 🧹 Cleaning up WebRTC resources');
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Reset WebRTC setup flag
    isWebRTCSetupRef.current = false;
    currentCallIdRef.current = null;
    
    // Clear intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current);
      qualityCheckIntervalRef.current = null;
    }
    
    // Clear audio elements
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    console.log('[AUDIO_CALL] ✅ Cleanup completed');
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-400 rounded-full blur-3xl"></div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-6 left-6 right-6 z-10 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-large animate-slide-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-sm font-bold">!</span>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Enhanced Call Info */}
      <div className="text-center mb-12 relative z-10">
        <div className="relative mb-8 animate-bounce-in">
          <div className="relative">
            <img
              src={otherUser.profilePictureUrl || '/default-avatar.png'}
              alt={otherUser.fullName || otherUser.username}
              className="w-40 h-40 rounded-full mx-auto object-cover border-4 border-white dark:border-gray-800 shadow-large ring-4 ring-primary-200/50 dark:ring-primary-800/50"
            />
            {callStatus === 'connected' && (
              <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-medium ${getConnectionQualityColor()}`}>
                <div className={`w-6 h-6 rounded-full ${getConnectionQualityColor().replace('text-', 'bg-')} animate-pulse`}></div>
              </div>
            )}
            
            {/* Call Status Ring */}
            {(callStatus === 'ringing' || callStatus === 'connected') && (
              <div className="absolute inset-0 rounded-full border-4 border-primary-400/30 animate-ping"></div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="heading-2 text-gray-900 dark:text-white">
            {otherUser.fullName || otherUser.username}
          </h2>
          
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              callStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              callStatus === 'ringing' ? 'bg-yellow-500 animate-pulse' :
              'bg-gray-400'
            }`}></div>
            <p className="text-lg text-subtle font-medium">
              {getStatusText()}
            </p>
          </div>
          
          {callStatus === 'connected' && (
            <div className="flex items-center justify-center space-x-4 text-sm text-muted">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Connected</span>
              </span>
              <span>•</span>
              <span>Quality: {connectionQuality}</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {(callStatus === 'initiating' || callStatus === 'ringing') && (
        <div className="mb-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Enhanced Call Controls */}
      <div className="flex items-center justify-center space-x-8 relative z-10">
        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          disabled={callStatus !== 'connected'}
          className={`call-button ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500' 
              : 'bg-white/90 hover:bg-white text-gray-700 dark:bg-gray-800/90 dark:hover:bg-gray-800 dark:text-gray-300 focus:ring-gray-500'
          } shadow-large hover:shadow-glow-lg transition-all duration-300`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Speaker */}
        <button
          onClick={toggleSpeaker}
          disabled={callStatus !== 'connected'}
          className={`call-button ${
            isSpeakerEnabled 
              ? 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500' 
              : 'bg-white/90 hover:bg-white text-gray-700 dark:bg-gray-800/90 dark:hover:bg-gray-800 dark:text-gray-300 focus:ring-gray-500'
          } shadow-large hover:shadow-glow-lg transition-all duration-300`}
        >
          {isSpeakerEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>

        {/* End Call */}
        <button
          onClick={endCall}
          disabled={callStatus === 'ended'}
          className="call-button-danger shadow-large hover:shadow-glow-lg transition-all duration-300"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        {/* Accept Call (for incoming calls) */}
        {isIncoming && callStatus === 'incoming' && (
          <button
            onClick={acceptCall}
            className="call-button-success shadow-large hover:shadow-glow-lg transition-all duration-300"
          >
            <Phone className="w-6 h-6" />
          </button>
        )}

        {/* Reject Call (for incoming calls) */}
        {isIncoming && callStatus === 'incoming' && (
          <button
            onClick={rejectCall}
            className="call-button-danger shadow-large hover:shadow-glow-lg transition-all duration-300"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/90 hover:bg-white text-gray-700 dark:bg-gray-800/90 dark:hover:bg-gray-800 dark:text-gray-300 shadow-medium hover:shadow-large transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/50"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Enhanced Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-20 right-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-large p-6 min-w-[240px] border border-gray-200/50 dark:border-gray-700/50 animate-slide-in z-20">
          <h3 className="heading-4 text-gray-900 dark:text-white mb-4">
            Call Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mute</span>
              <button
                onClick={toggleMute}
                className={`w-12 h-6 rounded-full transition-all duration-200 ${
                  isMuted ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-medium transition-all duration-200 ${
                    isMuted ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Speaker</span>
              <button
                onClick={toggleSpeaker}
                className={`w-12 h-6 rounded-full transition-all duration-200 ${
                  isSpeakerEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-medium transition-all duration-200 ${
                    isSpeakerEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connection</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  connectionQuality === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  connectionQuality === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  connectionQuality === 'fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {connectionQuality}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
};

export default EnhancedAudioCall;
