import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CallRecord } from '../types/chat';
import { useNotification } from '../../components/NotificationProvider';

interface CallComponentProps {
  callerId: string;
  calleeId: string;
  onHangup: () => void;
  onCallConnected: (callId: string) => void;
}

/**
 * Voice Call Component
 * Features:
 * - Live call timer (HH:MM:SS)
 * - Speaker toggle (setSinkId with fallback)
 * - Persist call history to Supabase
 * - Mobile-friendly UI
 */
export const CallComponent: React.FC<CallComponentProps> = ({
  callerId,
  calleeId,
  onHangup,
  onCallConnected,
}) => {
  const { showNotification } = useNotification();
  const [isConnected, setIsConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [speakerSupported, setSpeakerSupported] = useState(true);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedSinkId, setSelectedSinkId] = useState<string | undefined>();
  const [profile, setProfile] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartRef = useRef<Date | null>(null);
  const callIdRef = useRef<string>('');
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const remoteStreamAttachedRef = useRef(false);

  // Check for speaker support
  useEffect(() => {
    const checkSpeakerSupport = async () => {
      try {
        // Check if setSinkId is supported
        if (!audioElementRef.current?.setSinkId) {
          setSpeakerSupported(false);
          return;
        }

        // Enumerate audio output devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputDevices = devices.filter((d) => d.kind === 'audiooutput');
        setAudioDevices(audioOutputDevices);

        if (audioOutputDevices.length <= 1) {
          setSpeakerSupported(false);
        }
      } catch (err) {
        console.error('Failed to check speaker support:', err);
        setSpeakerSupported(false);
      }
    };

    checkSpeakerSupport();
  }, []);

  // Real WebRTC connection handler
  const handleCallConnect = useCallback(async () => {
    setConnectionError(null);
    callStartRef.current = new Date();

    console.debug('[WebRTC] Call initiated:', { callerId, calleeId });

    try {
      // Step 1: Get user media (microphone)
      console.debug('[WebRTC] Requesting microphone...');
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.debug('[WebRTC] Got local stream with', localStream.getAudioTracks().length, 'audio track(s)');

      // Step 2: Create RTCPeerConnection with STUN servers
      const config = {
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
          // Add TURN server if needed (for NAT traversal)
          // { urls: ['turn:turnserver.example.com'], username: 'user', credential: 'pass' }
        ],
      };

      const peerConnection = new RTCPeerConnection(config);
      console.debug('[WebRTC] RTCPeerConnection created');

      // Step 3: Add local stream tracks to connection
      localStream.getAudioTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        console.debug('[WebRTC] Added local audio track to peer connection');
      });

      // Step 4: Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.debug('[WebRTC] ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
          // In production, send to signaling server
        } else {
          console.debug('[WebRTC] ICE gathering complete');
        }
      };

      // Step 5: Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.debug('[WebRTC] Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.debug('[WebRTC] Peer connection established');
          // Connection is now ready
        } else if (peerConnection.connectionState === 'failed') {
          setConnectionError('WebRTC connection failed. Check network and permissions.');
          console.error('[WebRTC] Connection failed');
        } else if (peerConnection.connectionState === 'disconnected') {
          console.warn('[WebRTC] Connection disconnected');
        }
      };

      // Step 6: Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.debug('[WebRTC] ICE connection state:', peerConnection.iceConnectionState);
      };

      // Step 7: Handle remote stream
      peerConnection.ontrack = (event) => {
        console.debug('[WebRTC] Remote track received:', event.track.kind);
        attachRemoteStream(event.streams[0]);
      };

      // Step 8: Create and send offer (caller initiates)
      console.debug('[WebRTC] Creating offer...');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.debug('[WebRTC] Offer created and set as local description');

      // In production, send offer to signaling server:
      // await fetch('/api/webrtc/offer', { method: 'POST', body: JSON.stringify({ offer, targetUserId: calleeId }) });
      console.debug('[WebRTC] Offer would be sent to signaling server:', { callerId, calleeId });

      // Step 9: Simulate receiving answer (in production, from signaling server)
      // For demo, we'll wait a bit and create a self-answer to test the flow
      setTimeout(async () => {
        try {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          await peerConnection.setLocalDescription(answer);
          console.debug('[WebRTC] Demo answer created (in production, received from peer)');
        } catch (e) {
          console.debug('[WebRTC] Answer negotiation skipped (test mode)');
        }
      }, 100);

      // Step 10: Mark as connected and start timer
      setIsConnected(true);
      const newCallId = `call_${Date.now()}`;
      callIdRef.current = newCallId;
      onCallConnected(newCallId);

      // Start call timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // Cleanup on unmount
      return () => {
        console.debug('[WebRTC] Cleaning up connection');
        localStream.getTracks().forEach((track) => track.stop());
        peerConnection.close();
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error('[WebRTC] Connection failed:', errorMsg, err?.name);
      setConnectionError(`Failed to connect: ${errorMsg}`);
      setIsConnected(false);
    }
  }, [callerId, calleeId, onCallConnected]);

  // Hangup handler - save call history
  const handleHangup = useCallback(async () => {
    setIsConnected(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Save call history to Supabase
    if (callStartRef.current && callIdRef.current) {
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - callStartRef.current.getTime()) / 1000);

      console.debug('[WebRTC] Call ended, duration:', durationSeconds, 'seconds');

      try {
        const { error } = await supabase.from('call_history').insert([
          {
            call_id: callIdRef.current,
            caller_id: callerId,
            callee_id: calleeId,
            start_ts: callStartRef.current.toISOString(),
            end_ts: endTime.toISOString(),
            duration_seconds: durationSeconds,
          },
        ]);

        if (error) throw error;
        console.log('[WebRTC] Call history saved:', callIdRef.current);
      } catch (err) {
        console.error('[WebRTC] Failed to save call history:', err);
      }
    }

    setElapsedSeconds(0);
    callStartRef.current = null;
    onHangup();
  }, [callerId, calleeId, onHangup]);

  // Toggle speaker
  const handleToggleSpeaker = useCallback(async () => {
    if (!speakerSupported || !audioElementRef.current) return;
    if (!remoteStreamAttachedRef.current) {
      showNotification('Speaker routing will be available once remote audio is attached.', 'info');
      return;
    }

    try {
      if (!speakerEnabled && audioDevices.length > 0) {
        // Enable speaker - use first available speaker device
        const speakerDevice = audioDevices.find((d) => d.label.toLowerCase().includes('speaker')) ||
          audioDevices[0];
        await audioElementRef.current.setSinkId(speakerDevice.deviceId);
        console.debug('[WebRTC] Speaker routing enabled:', speakerDevice.label);
        setSelectedSinkId(speakerDevice.deviceId);
        setSpeakerEnabled(true);

        // Persist to localStorage
        localStorage.setItem('preferredAudioSinkId', speakerDevice.deviceId);
      } else {
        // Disable speaker - reset to default
        await audioElementRef.current.setSinkId('');
        console.debug('[WebRTC] Speaker routing disabled, reverted to default');
        setSelectedSinkId(undefined);
        setSpeakerEnabled(false);
        localStorage.removeItem('preferredAudioSinkId');
      }
    } catch (err) {
      console.error('[WebRTC] Failed to toggle speaker:', err);
      showNotification('Could not toggle speaker. Please check permissions.', 'error');
    }
  }, [speakerEnabled, audioDevices, speakerSupported]);

  // Attach remote stream helper (to be called when remote track arrives)
  const attachRemoteStream = (stream: MediaStream) => {
    try {
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = stream;
        console.debug('[WebRTC] Remote stream attached:', stream.getAudioTracks().length, 'audio track(s)');
        audioElementRef.current.play().catch((e) => {
          console.debug('[WebRTC] Audio play suppressed (expected in some browsers):', e?.message);
        });
        remoteStreamAttachedRef.current = true;
      }
    } catch (err) {
      console.error('[WebRTC] Failed to attach remote stream:', err);
    }
  };

  // Test mic permission / getUserMedia quick check
  const handleTestMic = async () => {
    try {
      console.debug('[WebRTC] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.debug('[WebRTC] getUserMedia success, tracks:', stream.getAudioTracks());
      stream.getTracks().forEach((t) => t.stop());
      showNotification('Microphone access OK', 'success');
    } catch (err: any) {
      console.error('[WebRTC] getUserMedia error:', err?.message || String(err), err?.name);
      showNotification('Microphone permission failed: ' + (err?.message || String(err)), 'error');
    }
  };

  // Fetch profile avatar for callee or caller
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const uid = calleeId || callerId;
        const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', uid).single();
        if (!error) setProfile(data);
      } catch (err) {
        console.debug('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, [callerId, calleeId]);

  // Format elapsed time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-b from-pink-500 to-pink-600 text-white rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold text-white">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile?.full_name || 'Avatar'} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              (profile?.full_name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">Ready to call {profile?.full_name || ''}</h3>
            <p className="text-sm opacity-80">Tap start to begin. Use TURN for NAT-restricted networks.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCallConnect}
            className="px-6 py-3 bg-white text-pink-600 rounded-full font-bold hover:bg-gray-100 transition"
          >
            Start Call
          </button>
          <button
            onClick={handleTestMic}
            className="px-4 py-2 bg-white/20 text-white rounded-full border border-white/30 hover:bg-white/30 transition"
          >
            Test mic
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-pink-500 to-pink-600 text-white rounded-lg">
      {/* Timer */}
      <div className="text-4xl font-mono font-bold">{formatTime(elapsedSeconds)}</div>

      {/* Connecting avatar */}
      <div className="absolute left-4 top-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/30 backdrop-blur">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile?.full_name || 'Avatar'} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <span className="text-white font-bold">{(profile?.full_name || 'U').charAt(0).toUpperCase()}</span>
          )}
        </div>
      </div>

      {/* Speaker toggle */}
      {speakerSupported ? (
        <button
          onClick={handleToggleSpeaker}
          className={`px-4 py-2 rounded-full font-semibold transition ${speakerEnabled ? 'bg-white text-pink-600' : 'bg-pink-400 text-white hover:bg-pink-300'
            }`}
        >
          {speakerEnabled ? '🔊 Speaker ON' : '🔇 Speaker OFF'}
        </button>
      ) : (
        <p className="text-sm italic text-pink-200">Speaker mode not supported on this browser</p>
      )}

      {/* Hangup button */}
      <button
        onClick={handleHangup}
        className="px-6 py-3 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition"
      >
        End Call
      </button>

      {/* Hidden audio element for speaker routing */}
      <audio ref={audioElementRef} style={{ display: 'none' }} />

      {/* Connection error modal */}
      {connectionError && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h4 className="text-lg font-semibold">Call error</h4>
            <p className="text-sm text-gray-700 my-3">{connectionError}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setConnectionError(null); handleTestMic(); }} className="px-3 py-1 bg-gray-100 rounded">Test mic</button>
              <button onClick={() => { setConnectionError(null); }} className="px-3 py-1 bg-pink-500 text-white rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallComponent;
