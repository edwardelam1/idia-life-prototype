import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CollapsedAvatar from './CollapsedAvatar';
import ExpandedChat from './ExpandedChat';
import { FriendState, Message } from './types';
import { AudioRecorder } from '@/utils/AudioRecorder';
import { getContextualGreeting } from './orbUtils';
import { useSyllableBlinking } from './useSyllableBlinking';
import { eventTracker } from '@/utils/EventTracker';
import { X, Keyboard, Mic, MicOff, Activity } from 'lucide-react'; // Added icons for Live UI

type Trigger = 'social' | 'wallet' | 'data' | 'achievement' | undefined;

interface FriendAssistantContextValue {
  open: (trigger?: Trigger) => void;
  startLiveMode: () => void; // Replaced expand() as primary entry
  switchToText: () => void;
  close: () => void;
  isVisible: boolean;
  isLiveMode: boolean; // Tracks if we are in immersive voice mode
  isTextMode: boolean; // Tracks if we are in fallback text mode
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
  const [isVisible, setIsVisible] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  
  const [trigger, setTrigger] = useState<Trigger>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [, setCurrentSpeechText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const { } = useSyllableBlinking();
  const isSyllableBlinking = friendState === 'speaking';

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        text: getContextualGreeting(trigger),
        isUser: false,
        timestamp: new Date(),
      }]);
    }
  }, [trigger, messages.length]);

  const speakText = useCallback(async (text: string) => {
    try {
      setFriendState('speaking');
      setCurrentSpeechText(text);
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: '9BWtsMINqrJLrRacOk9x' },
      });
      if (error) throw error;
      if (data?.audioContent) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        audio.onended = () => {
          setCurrentSpeechText('');
          if (isVoiceMode) setTimeout(() => startVoiceListening(), 500);
          else setFriendState('idle');
        };
        audio.volume = 0.8;
        await audio.play();
      } else {
        setFriendState('idle');
      }
    } catch (e) {
      console.error('speakText error', e);
      setFriendState('idle');
    }
  }, [isVoiceMode]);

  // Wired to call your Deno Edge Function instead of hardcoded responses
  const generateAIResponse = useCallback(async (userText: string) => {
    try {
      setFriendState('thinking');
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: userText,
          mode: isVoiceMode ? 'voice' : 'text',
          trigger_context: trigger
        }
      });

      if (error) throw error;

      const responseText = data?.response || "I'm processing that, give me one second.";
      
      const aiResponse: Message = {
        id: Date.now().toString() + '_ai',
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      eventTracker.trackAIInteraction({
        interaction_type: isVoiceMode ? 'voice' : 'text',
        conversation_length: messages.length + 1,
        topics: [trigger || 'general'],
        satisfaction: 0.8,
        voice_duration: isVoiceMode ? 3 : 0,
        feature: trigger,
        errors: 0,
      });

      await speakText(responseText);
    } catch (e) {
      console.error('AI Response Error:', e);
      setFriendState('idle');
    }
  }, [isVoiceMode, messages.length, trigger, speakText]);

  const processVoiceInput = useCallback(async (audioData: string) => {
    try {
      setFriendState('thinking');
      setIsListening(false);
      const { data, error } = await supabase.functions.invoke('voice-to-text', { body: { audio: audioData } });
      if (error) throw error;
      if (data?.text?.trim()) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isUser: true, timestamp: new Date() }]);
        await generateAIResponse(data.text);
      } else if (isVoiceMode) {
        setTimeout(() => startVoiceListening(), 500);
      } else {
        setFriendState('idle');
      }
    } catch (e) {
      console.error('processVoiceInput error', e);
      setFriendState('idle');
    }
  }, [isVoiceMode, generateAIResponse]);

  const startVoiceListening = async () => {
    try {
      setIsListening(true);
      setFriendState('listening');
      audioRecorderRef.current = new AudioRecorder(processVoiceInput, () => {});
      await audioRecorderRef.current.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setFriendState('idle');
    }
  };

  const stopVoiceListening = () => {
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
    // PRIMARY ENTRY POINT: Drops user straight into immersive voice mode
    startLiveMode: async () => {
      setIsTextMode(false);
      setIsLiveMode(true);
      setIsVoiceMode(true);
      await startVoiceListening();
    },
    // SECONDARY ENTRY POINT: Fallback to chat UI
    switchToText: () => {
      setIsLiveMode(false);
      setIsTextMode(true);
      setIsVoiceMode(false);
      stopVoiceListening();
    },
    close: () => {
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

  // Listen to legacy showFriend events
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
      
      {/* GEMINI LIVE-STYLE IMMERSIVE OVERLAY */}
      {isVisible && isLiveMode && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          
          {/* Header Controls */}
          <div className="absolute top-8 w-full px-8 flex justify-between items-center">
            <Badge variant="outline" className="border-white/20 text-white/50 uppercase tracking-widest bg-black/50">
              Live Session
            </Badge>
            <button onClick={value.close} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Dynamic Central Orb */}
          <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
            {/* Ambient Glow */}
            <div className={`absolute inset-0 rounded-full blur-[100px] transition-all duration-1000 opacity-60
              ${friendState === 'listening' ? 'bg-blue-500 scale-110' : 
                friendState === 'thinking' ? 'bg-purple-500 scale-90' : 
                friendState === 'speaking' ? 'bg-teal-400 scale-125' : 'bg-slate-500 scale-100'}`} 
            />
            
            {/* Core Orb Container */}
            <div className={`relative z-10 w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700
              ${friendState === 'thinking' ? 'animate-spin' : ''}
              ${friendState === 'speaking' ? 'animate-pulse' : ''}
              bg-gradient-to-br from-white/20 to-white/5 border border-white/30 backdrop-blur-md shadow-[inset_0_0_40px_rgba(255,255,255,0.2)]`}
            >
               {/* Internal Visualizer */}
               {friendState === 'listening' && <Mic className="w-12 h-12 text-white/80 animate-pulse" />}
               {friendState === 'thinking' && <Activity className="w-12 h-12 text-white/80" />}
               {friendState === 'speaking' && (
                 <div className="flex gap-2 items-center">
                   <div className="w-2 h-8 bg-white/80 rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                   <div className="w-2 h-12 bg-white/80 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                   <div className="w-2 h-8 bg-white/80 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
                 </div>
               )}
            </div>
          </div>

          {/* Status Text */}
          <div className="mt-16 text-center space-y-2 h-20">
            <p className="text-white/40 font-black uppercase tracking-[0.3em] text-xs">
              {friendState === 'listening' ? 'Listening...' : 
               friendState === 'thinking' ? 'Processing...' : 
               friendState === 'speaking' ? 'Speaking...' : 'Standby'}
            </p>
          </div>

          {/* Footer Controls */}
          <div className="absolute bottom-12 w-full flex justify-center gap-6">
            <button 
              onClick={handleVoiceToggle}
              className={`p-5 rounded-full backdrop-blur-md transition-all ${isListening ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button 
              onClick={value.switchToText}
              className="p-5 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5 backdrop-blur-md transition-all"
            >
              <Keyboard className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* FALLBACK: STANDARD TEXT CHAT UI */}
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
      onOrbClick={startLiveMode} // Re-routed to Live Mode immediately
    />
  );
};