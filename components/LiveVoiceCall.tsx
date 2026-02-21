import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Persona } from '../types';
import { Mic, MicOff, PhoneOff, User, Volume2, AlertTriangle, Heart, Sparkles, X, Circle, Square, Download } from 'lucide-react';
import { LANGUAGE_CONTROL_SYSTEM_MESSAGE, NAME_AGNOSTIC_NOTE, GATING_CONFIG } from '../constants';
import { useAuth } from '../src/contexts/AuthContext';
import { useGating } from '../src/hooks/useGating';
import { storage } from '../utils/storage';

import { geminiRotator } from '../utils/ai-rotator';

interface LiveVoiceCallProps {
  persona: Persona;
  avatarUrl?: string;
  onClose: () => void;
}

const LiveVoiceCall: React.FC<LiveVoiceCallProps> = ({ persona, avatarUrl, onClose }) => {
  const { profile, upgradeSubscription } = useAuth();
  const { subscription } = useGating();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  // ... rest of state stays same
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'closed' | 'rate_limited'>('connecting');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // ... refs stay same
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mixedStreamTargetRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Gating effect
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    // Free user preview limit: 15 seconds
    if (subscription === 'free' && elapsedTime >= 15) {
      setConnectionStatus('closed');
      setShowPaywall(true);
      if (processorRef.current) processorRef.current.disconnect();
    }
  }, [elapsedTime, subscription, connectionStatus]);

  useEffect(() => {
    let mounted = true;
    const startSession = async () => {
      const keyState = geminiRotator.getKey();
      if (!keyState) {
        if (mounted) {
          setLastError('Missing Gemini API key.');
          setConnectionStatus('error');
        }
        return;
      }

      const apiKey = keyState.value;

      try {
        const ai = new GoogleGenAI({ apiKey });
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

        // Target for recording mixing
        mixedStreamTargetRef.current = outputAudioContextRef.current.createMediaStreamDestination();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const voiceName = persona.gender === 'female' ? 'Kore' : 'Fenrir';
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.0-flash',
          callbacks: {
            onopen: () => {
              if (!mounted) return;
              setConnectionStatus('connected');
              callStartTimeRef.current = Date.now();
              const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);

              // Connect mic to mixed stream for recording
              const micForMixing = outputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
              micForMixing.connect(mixedStreamTargetRef.current!);

              const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
              processorRef.current = scriptProcessor;
              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted || connectionStatus !== 'connected') return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                if (sessionRef.current && connectionStatus === 'connected') {
                  sessionRef.current.sendRealtimeInput({ media: pcmBlob });
                }
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContextRef.current!.destination);
            },
            onmessage: async (message: any) => {
              if (!mounted) return;
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;

                // Connect model audio to destination AND mixed stream for recording
                source.connect(ctx.destination);
                source.connect(mixedStreamTargetRef.current!);

                source.start(Math.max(nextStartTimeRef.current, ctx.currentTime));
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime) + audioBuffer.duration;
              }
            },
            onclose: () => {
              if (mounted) setConnectionStatus('closed');
            },
            onerror: (err: any) => {
              if (mounted) {
                geminiRotator.rotate(err.message || "Voice Connection Error");
                setConnectionStatus('error');
                setLastError("Connection lost. Retrying...");
              }
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            systemInstruction: `${LANGUAGE_CONTROL_SYSTEM_MESSAGE}\n\n${NAME_AGNOSTIC_NOTE}`
          }
        });
        sessionRef.current = await sessionPromise;
      } catch (err: any) {
        if (mounted) {
          geminiRotator.rotate(err.message || "Init Failed");
          setConnectionStatus('error');
          setLastError("Voice Engine Initializing...");
        }
      }
    };
    startSession();
    return () => {
      mounted = false;
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sessionRef.current) {
        sessionRef.current = null;
      }
    };
  }, [persona, attempt, isMuted, connectionStatus]);


  // Background Handling Logic
  useEffect(() => {
    if (connectionStatus === 'connected') {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'START_CALL',
          personaId: persona.id
        });
      }
    }
    return () => {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'END_CALL' });
      }
    };
  }, [connectionStatus, persona.id]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.serviceWorker?.controller) {
        // Sync with Service Worker in case tab was throttled
        navigator.serviceWorker.controller.postMessage({ type: 'GET_CALL_STATUS' });
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CALL_STATUS' && event.data.isActive) {
        const swElapsed = Math.floor((event.data.currentTime - event.data.startTime) / 1000);
        if (swElapsed > elapsedTime) setElapsedTime(swElapsed);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    const timerInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(timerInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [connectionStatus, elapsedTime]);

  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!mixedStreamTargetRef.current) return;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(mixedStreamTargetRef.current.stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-record-${persona.name}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    }
  };

  // Utility functions (encode, decode, etc)
  function createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  }
  function encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }
  function formatTime(seconds: number) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm mx-4 aspect-[3/4] max-h-[600px] relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#FFE6F4] via-[#E6E6FA] to-[#FDF2F8] shadow-2xl border-2 border-white/70">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-[#FF9ACB]/30 to-[#B28DFF]/30 animate-pulse rounded-full mix-blend-multiply filter blur-[80px]" />
        </div>
        <div className="relative z-10 h-full flex flex-col items-center justify-between py-12 px-6">
          <div className="text-center space-y-2">
            <h2 className="text-[#5e3a58] text-sm font-bold tracking-widest uppercase opacity-70">Voice Call</h2>
            {connectionStatus === 'connected' && (
              <div className="text-2xl font-mono font-bold text-[#FF9ACB] tracking-wider">
                {formatTime(elapsedTime)}
              </div>
            )}
            <div className={`px-3 py-1 rounded-full inline-flex items-center gap-2 ${connectionStatus === 'connected' ? 'bg-green-100 text-green-700' : (connectionStatus === 'error' || connectionStatus === 'rate_limited') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {(connectionStatus === 'error' || connectionStatus === 'rate_limited') ? <AlertTriangle size={12} /> : <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />}
              <span className="text-xs font-medium">
                {connectionStatus === 'connecting' ? 'Connecting...' : connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'rate_limited' ? 'System Busy (429)' : connectionStatus === 'error' ? 'Error' : 'Ended'}
              </span>
            </div>

            {subscription === 'free' && connectionStatus === 'connected' && (
              <div className="mt-2 px-3 py-1 bg-white/40 backdrop-blur-md rounded-lg border border-[#FF9ACB]/30 animate-pulse">
                <p className="text-[10px] font-bold text-[#FF9ACB] uppercase tracking-tighter">Preview Mode: 15s</p>
              </div>
            )}
          </div>

          <div className="relative">
            {connectionStatus === 'connected' && (
              <>
                <div className={`absolute inset-0 bg-[#FF9ACB] rounded-full blur-xl opacity-40 transition-transform duration-100`} style={{ transform: `scale(${1 + volumeLevel})` }} />
                <div className={`absolute inset-0 bg-[#B28DFF] rounded-full blur-2xl opacity-30 transition-transform duration-150 delay-75`} style={{ transform: `scale(${1 + volumeLevel * 1.5})` }} />
              </>
            )}
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-[#FF9ACB] to-[#B28DFF] p-1 shadow-[0_10px_40px_rgba(255,154,203,0.5)]">
              <div className="w-full h-full rounded-full bg-white/90 flex items-center justify-center overflow-hidden border-4 border-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-[#5e3a58] opacity-50" />
                )}
              </div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-2xl font-serif-display text-[#4A2040]">{persona.name}</h3>
            <p className="text-[#8e6a88] text-sm italic font-medium">AI Companion</p>
          </div>

          <div className="flex items-center gap-6 mb-4">
            <button
              onClick={toggleRecording}
              className={`p-4 rounded-full border border-white/50 backdrop-blur-md shadow-lg transition-all active:scale-95 ${isRecording ? 'bg-red-50 text-red-500' : 'bg-white/40 text-[#5e3a58]'}`}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? <Square size={20} fill="currentColor" /> : <Circle size={20} className="text-red-500 fill-red-500" />}
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full border border-white/50 backdrop-blur-md shadow-lg transition-all active:scale-95 ${isMuted ? 'bg-white text-gray-400' : 'bg-white/40 text-[#5e3a58]'}`}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button onClick={onClose} className="p-6 rounded-full bg-red-400 text-white shadow-[0_8px_25px_rgba(248,113,113,0.5)] hover:bg-red-500 transition-all transform hover:scale-105 active:scale-95 border-4 border-white/30">
              <PhoneOff size={32} fill="currentColor" />
            </button>
            <div className="p-4 rounded-full border border-white/50 bg-white/40 text-[#5e3a58] backdrop-blur-md shadow-lg">
              <Volume2 size={24} className={connectionStatus === 'connected' ? 'animate-pulse' : 'opacity-50'} />
            </div>
          </div>
        </div>

        {/* VOICE PAYWALL OVERLAY */}
        {showPaywall && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-white/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FF9ACB] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#FF9ACB]/30 animate-bounce">
                <Volume2 size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-serif-display font-bold text-[#4A2040] mb-3">Immerse yourself in conversation.</h3>
              <p className="text-[#8e6a88] text-sm leading-relaxed mb-8">
                Your companion is ready to continue the dialogue.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FF9ACB]/10 border border-[#FF9ACB]/20">
                  <span className="text-xs font-bold text-[#4A2040]">Voice Tokens</span>
                  <span className="text-xs font-bold text-[#FF9ACB]">₹{GATING_CONFIG.prices.voiceCallMinute * 30} / 30m</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#B28DFF]/10 border border-[#B28DFF]/20">
                  <span className="text-xs font-bold text-[#4A2040]">Premium Plus</span>
                  <span className="text-xs font-bold text-[#B28DFF]">Unlimited</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  await upgradeSubscription('plus');
                  setShowPaywall(false);
                  setConnectionStatus('connecting');
                  setAttempt(a => a + 1);
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold text-lg shadow-xl"
              >
                Unlock Unlimited
              </button>

              <button
                onClick={() => {
                  if (profile.hearts >= 15) {
                    storage.spendHearts(15);
                    setShowPaywall(false);
                    setConnectionStatus('connecting');
                    setAttempt(a => a + 1);
                  } else {
                    onClose();
                  }
                }}
                className="w-full py-4 mt-3 rounded-2xl bg-white border-2 border-[#FF9ACB] text-[#FF9ACB] font-bold text-lg shadow-sm"
              >
                Clear the Line (15 Hearts)
              </button>

              <button onClick={onClose} className="mt-4 text-xs font-bold text-[#8e6a88] hover:text-[#5e3a58] transition-colors">
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVoiceCall;