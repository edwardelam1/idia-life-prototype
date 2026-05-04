import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CollapsedAvatar from './CollapsedAvatar';
import ExpandedChat from './ExpandedChat';
import SovereignVisualizer from './SovereignVisualizer'; // Integrated 3D Engine
import { FriendState, Message } from './types';
import { AudioRecorder } from '@/utils/AudioRecorder';
import { getContextualGreeting } from './orbUtils';
import { useSyllableBlinking } from './useSyllableBlinking';
import { eventTracker } from '@/utils/EventTracker';
import { X, Keyboard, Mic, MicOff } from 'lucide-react'; 
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";

type Trigger = 'social' | 'wallet' | 'data' | 'achievement' | undefined;

interface FriendAssistantContextValue {
  open: (trigger?: Trigger) => void;
  startLiveMode: () => void;
  switchToText: () => void;
  close: () => void;
  isVisible: boolean;
  isLiveMode: boolean;
  isTextMode: boolean;
  friendState: FriendState;
  isSyllableBlinking: boolean;
  isListening: boolean;
}

const FriendAssistantContext = createContext<FriendAssistantContextValue | null>(null);

export const useFriendAssistant = () => {
  const ctx = useContext(FriendAssistantContext);
  if (!ctx) throw new Error('useFriendAssistant must be used within FriendAssistantProvider');
  return ctx;
};

export const FriendAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  
  const [trigger, setTrigger] = useState<Trigger>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  // Resolved Identity with dynamic fallback
  const assistantName = (profile as any)?.ai_assistant_name || "Friend";

  const { } = useSyllableBlinking();
  const isSyllableBlinking = friendState === 'speaking';

  // --- IDENTITY & GREETING INTEGRITY LOOP ---
  useEffect(() => {
    // Integrity Guard: Wait for the profile ledger to resolve before first contact
    if (!profile) {
      console.log("=== [GREETING_HALT] Waiting for profile identity resolution... ===");
      return;
    }

    if (messages.length === 0) {
      console.log(`=== [INITIAL_GREETING_START] Identity Resolved: ${assistantName} ===`);
      
      const greetingText = getContextualGreeting(trigger, assistantName);

      setMessages([{
        id: 'initial_contact_id',
        text: greetingText,
        isUser: false,
        timestamp: new Date(),
      }]);

      console.log("=== [INITIAL_GREETING_END] Greeting established in local buffer ===");
    }
  }, [trigger, messages.length, profile, assistantName]);

  const speakText = useCallback(async (text: string) => {
    console.log("=== [VOICE_OUT_START] Synthesizing: ", text.substring(0, 30), "... ===");
    try {
      setFriendState('speaking');
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: '9BWtsMINqrJLrRacOk9x' },
      });
      if (error) throw error;
      if (data?.audioContent) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audio.onended = () => {
          console.log("=== [VOICE_OUT_END] Playback completed ===");
          if (isVoiceMode) {
            console.log("=== [VOICE_LOOP] Recycling listener context ===");
            setTimeout(() => startVoiceListening(), 400);
          } else {
            setFriendState('idle');
          }
        };
        audio.volume = 0.8;
        await audio.play();
      } else {
        setFriendState('idle');
      }
    } catch (e) {
      console.error('=== [VOICE_OUT_CRITICAL] TTS Engine Stalled:', e, "=== ");
      setFriendState('idle');
    }
  }, [isVoiceMode]);

  const generateAIResponse = useCallback(async (userText: string) => {
    console.log("=== [AI_CHAT_START] Dispatching to Edge Function: ", userText.substring(0, 30), " ===");
    try {
      setFriendState('thinking');
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: userText,
          mode: isVoiceMode ? 'voice' : 'text',
          trigger_context: trigger,
          user_id: profile?.id // Passing UID for identity consistency in the brain
        }
      });

      if (error) throw error;

      const responseText = data?.response || "I'm processing a high-load request. Give me one moment.";
      console.log("=== [AI_CHAT_RESPONSE] Egress received: ", responseText.substring(0, 30), "===");
      
      const aiResponse: Message = {
        id: Date.now().toString() + '_ai',
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      await speakText(responseText);
    } catch (e) {
      console.error('=== [AI_CHAT_CRITICAL] Brain Egress Stalled:', e, "=== ");
      setFriendState('idle');
    }
  }, [isVoiceMode, messages.length, trigger, speakText, profile?.id]);

  const processVoiceInput = useCallback(async (audioData: string) => {
    console.log("=== [VOICE_IN_START] Audio stream captured, initiating transcription ===");
    try {
      setFriendState('thinking');
      setIsListening(false);
      const { data, error } = await supabase.functions.invoke('voice-to-text', { body: { audio: audioData } });
      
      if (error) throw error;
      
      if (data?.text?.trim()) {
        console.log("=== [VOICE_IN_SUCCESS] Decoded: ", data.text, "===");
        setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isUser: true, timestamp: new Date() }]);
        await generateAIResponse(data.text);
      } else if (isVoiceMode) {
        console.warn("=== [VOICE_IN_EMPTY] Silent stream detected, cycling ===");
        setTimeout(() => startVoiceListening(), 400);
      } else {
        setFriendState('idle');
      }
    } catch (e) {
      console.error('=== [VOICE_IN_CRITICAL] STT Failed:', e, "===");
      setFriendState('idle');
    }
  }, [isVoiceMode, generateAIResponse]);

  const startVoiceListening = async () => {
    console.log("=== [LISTENER_START] Activating local hardware mic ===");
    try {
      setIsListening(true);
      setFriendState('listening');
      audioRecorderRef.current = new AudioRecorder(processVoiceInput, () => {});
      await audioRecorderRef.current.start();
    } catch (e) {
      console.error("=== [LISTENER_ERROR] Hardware access denied ===");
      setIsListening(false);
      setFriendState('idle');
    }
  };

  const stopVoiceListening = () => {
    console.log("=== [LISTENER_STOP] Deactivating hardware mic ===");
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    setIsListening(false);
    setFriendState('idle');
  };

  const handleVoiceToggle = async () => {
    if (isVoiceMode) {
      setIsVoiceMode(false);
      stopVoiceListening();
    } else {
      setIsVoiceMode(true);
      await startVoiceListening();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), text: inputValue, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    await generateAIResponse(userMessage.text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const value: FriendAssistantContextValue = {
    open: (t) => { setTrigger(t); setIsVisible(true); },
    startLiveMode: async () => {
      console.log("=== [UI_PIVOT] Transitioning to Sovereign Live Interface ===");
      setIsTextMode(false);
      setIsLiveMode(true);
      setIsVoiceMode(true);
      await startVoiceListening();
    },
    switchToText: () => {
      console.log("=== [UI_PIVOT] Reverting to Text Standard ===");
      setIsLiveMode(false);
      setIsTextMode(true);
      setIsVoiceMode(false);
      stopVoiceListening();
    },
    close: () => {
      console.log("=== [UI_SHUTDOWN] Terminating session ===");
      setIsLiveMode(false);
      setIsTextMode(false);
      setIsVoiceMode(false);
      stopVoiceListening();
      setFriendState('idle');
    },
    isVisible,
    isLiveMode,
    isTextMode,
    friendState,
    isSyllableBlinking,
    isListening,
  };

  useEffect(() => {
    const handler = (e: any) => {
      setTrigger(e.detail?.trigger);
      setIsVisible(true);
    };
    window.addEventListener('showFriend', handler);
    return () => window.removeEventListener('showFriend', handler);
  }, []);

  return (
    <FriendAssistantContext.Provider value={value}>
      {children}
      
      {/* IMMERSIVE LIVE UI (Gemini Live Protocol) */}
      {isVisible && isLiveMode && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
          
          <SovereignVisualizer 
            state={friendState} 
            severity={trigger === 'achievement' ? 'important' : 'normal'} 
          />

          {/* Header Protocol */}
          <div className="absolute top-8 w-full px-8 flex justify-between items-center z-50">
            <Badge variant="outline" className="border-white/10 text-white/40 uppercase tracking-[0.4em] bg-black/20 backdrop-blur-md px-4 py-1">
              {assistantName} Live
            </Badge>
            <button onClick={value.close} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>

          {/* Projection Status */}
          <div className="absolute bottom-40 text-center z-50 pointer-events-none">
            <p className="text-white/20 font-black uppercase tracking-[0.6em] text-[10px] animate-pulse">
              {friendState === 'listening' ? 'Ingesting Stream' : 
               friendState === 'thinking' ? 'Deep Analysis' : 
               friendState === 'speaking' ? `Projecting ${assistantName}` : ''}
            </p>
          </div>

          {/* Sovereign Controls */}
          <div className="absolute bottom-12 w-full flex justify-center gap-8 z-50">
            <button 
              onClick={handleVoiceToggle}
              className={`p-6 rounded-full backdrop-blur-xl transition-all duration-500 ${isListening ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.1)]' : 'bg-white/5 text-white border border-white/10'}`}
            >
              {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
            </button>
            <button 
              onClick={value.switchToText}
              className="p-6 rounded-full bg-white/5 text-white/30 border border-white/5 backdrop-blur-xl hover:text-white transition-colors"
            >
              <Keyboard className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* FALLBACK UI */}
      {isVisible && isTextMode && (
        <div className="fixed bottom-4 right-4 z-50">
          <ExpandedChat
            messages={messages}
            inputValue={inputValue}
            friendState={friendState}
            isListening={isListening}
            isSyllableBlinking={isSyllableBlinking}
            isVoiceMode={isVoiceMode}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            onVoiceToggle={handleVoiceToggle}
            onCollapse={() => setIsTextMode(false)}
            onClose={value.close}
            onSpeakText={speakText}
          />
        </div>
      )}
    </FriendAssistantContext.Provider>
  );
};

export const FriendOrb: React.FC = () => {
  const { isVisible, friendState, isSyllableBlinking, isListening, startLiveMode } = useFriendAssistant();
  
  if (!isVisible) return null;
  
  return (
    <CollapsedAvatar
      friendState={friendState}
      isListening={isListening}
      isSyllableBlinking={isSyllableBlinking}
      onOrbClick={startLiveMode} 
    />
  );
};