import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CollapsedAvatar from './CollapsedAvatar';
import ExpandedChat from './ExpandedChat';
import { FriendState, Message } from './types';
import { AudioRecorder } from '@/utils/AudioRecorder';
import { getContextualGreeting } from './orbUtils';
import { useSyllableBlinking } from './useSyllableBlinking';
import { eventTracker } from '@/utils/EventTracker';

type Trigger = 'social' | 'wallet' | 'data' | 'achievement' | undefined;

interface FriendAssistantContextValue {
  open: (trigger?: Trigger) => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
  isVisible: boolean;
  isExpanded: boolean;
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
  const [isExpanded, setIsExpanded] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceMode]);

  const generateAIResponse = useCallback(async (userText: string) => {
    const responses = [
      "That's really interesting! Tell me more about how that affects your daily routine.",
      "I understand. How has that been impacting your wellness journey?",
      "Thanks for sharing that with me. What specific goals are you working towards?",
      "I'm here to support your health and wellness journey. What would you like to explore together?",
    ];
    const aiResponse: Message = {
      id: Date.now().toString() + '_ai',
      text: responses[Math.floor(Math.random() * responses.length)],
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
    await speakText(aiResponse.text);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    expand: () => setIsExpanded(true),
    collapse: () => setIsExpanded(false),
    close: () => {
      setIsExpanded(false);
      setIsVoiceMode(false);
      stopVoiceListening();
      setFriendState('idle');
    },
    isVisible,
    isExpanded,
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
      {isVisible && isExpanded && (
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
            onCollapse={() => setIsExpanded(false)}
            onClose={value.close}
            onSpeakText={speakText}
          />
        </div>
      )}
    </FriendAssistantContext.Provider>
  );
};

export const FriendOrb: React.FC = () => {
  const { isVisible, friendState, isSyllableBlinking, isListening, expand } = useFriendAssistant();
  if (!isVisible) return null;
  return (
    <CollapsedAvatar
      friendState={friendState}
      isListening={isListening}
      isSyllableBlinking={isSyllableBlinking}
      onOrbClick={expand}
    />
  );
};
