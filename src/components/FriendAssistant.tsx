import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CollapsedAvatar from './FriendAssistant/CollapsedAvatar';
import ExpandedChat from './FriendAssistant/ExpandedChat';
import { FriendState, Message } from './FriendAssistant/types';
import { AudioRecorder } from '@/utils/AudioRecorder';
import { getContextualGreeting } from './FriendAssistant/orbUtils';
import { useSyllableBlinking } from './FriendAssistant/useSyllableBlinking';
import { eventTracker } from '@/utils/EventTracker';

interface FriendAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  trigger?: 'social' | 'wallet' | 'data' | 'achievement';
}

const FriendAssistant: React.FC<FriendAssistantProps> = ({ isVisible, onClose, trigger }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  // Use syllable blinking hook
  const { currentSyllable } = useSyllableBlinking();
  const isSyllableBlinking = friendState === 'speaking';

  // Initialize with contextual greeting based on trigger
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const greeting = getContextualGreeting(trigger);

      setMessages([{
        id: '1',
        text: greeting,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [isVisible, trigger, messages.length]);

  const speakText = async (text: string) => {
    try {
      console.log('Attempting to speak text:', text);
      setFriendState('speaking');
      setCurrentSpeechText(text);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: '9BWtsMINqrJLrRacOk9x' } // Aria voice
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.audioContent) {
        console.log('Audio content received, creating audio element');
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
        
        // Add event listeners for debugging
        audio.oncanplaythrough = () => console.log('Audio can play through');
        audio.onplay = () => console.log('Audio started playing');
        audio.onended = () => {
          console.log('Audio finished playing');
          setCurrentSpeechText('');
          // If in voice mode, automatically start listening again
          if (isVoiceMode) {
            setTimeout(() => startVoiceListening(), 500);
          } else {
            setFriendState('idle');
          }
        };
        audio.onerror = (e) => console.error('Audio playback error:', e);
        
        // Set volume to ensure it's audible
        audio.volume = 0.8;
        
        await audio.play();
        console.log('Audio play() called successfully');
      } else {
        console.error('No audio content received from text-to-speech function');
        setFriendState('idle');
      }
    } catch (error) {
      console.error('Error playing speech:', error);
      setFriendState('idle');
      
      // Add a visual indication when speech fails
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        text: "Sorry, I'm having trouble with my voice right now. But I can still chat with you!",
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const processVoiceInput = async (audioData: string) => {
    try {
      console.log('Processing voice input...');
      setFriendState('thinking');
      setIsListening(false);
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioData }
      });

      if (error) {
        console.error('Voice-to-text error:', error);
        throw error;
      }

      if (data?.text && data.text.trim()) {
        console.log('Transcribed text:', data.text);
        
        // Add user message to chat
        const userMessage: Message = {
          id: Date.now().toString(),
          text: data.text,
          isUser: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        // Generate AI response
        await generateAIResponse(data.text);
      } else {
        console.log('No text transcribed, returning to listening mode');
        if (isVoiceMode) {
          setTimeout(() => startVoiceListening(), 500);
        } else {
          setFriendState('idle');
        }
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      if (isVoiceMode) {
        setTimeout(() => startVoiceListening(), 1000);
      } else {
        setFriendState('idle');
      }
    }
  };

  const generateAIResponse = async (userText: string) => {
    try {
      // Enhanced AI responses based on health and wellness context
      const responses = [
        "That's really interesting! Tell me more about how that affects your daily routine.",
        "I understand. How has that been impacting your wellness journey?",
        "Thanks for sharing that with me. What specific goals are you working towards?",
        "I'm here to support your health and wellness journey. What would you like to explore together?",
        "That sounds important to you. How can I help you make progress with that?",
        "I appreciate you opening up about that. What steps have you already tried?",
        "That's a great point! Have you noticed any patterns or trends with that?",
        "I hear you. What does success look like to you in this area?"
      ];
      
      const aiResponse: Message = {
        id: Date.now().toString() + '_ai',
        text: responses[Math.floor(Math.random() * responses.length)],
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Track AI interaction
      eventTracker.trackAIInteraction({
        interaction_type: isVoiceMode ? 'voice' : 'text',
        conversation_length: messages.length + 1,
        topics: [trigger || 'general'],
        satisfaction: 0.8, // Default satisfaction
        voice_duration: isVoiceMode ? 3 : 0,
        feature: trigger,
        errors: 0
      });
      
      await speakText(aiResponse.text);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setFriendState('idle');
      
      // Track AI error
      eventTracker.trackAIInteraction({
        interaction_type: isVoiceMode ? 'voice' : 'text',
        conversation_length: messages.length,
        topics: [trigger || 'general'],
        feature: trigger,
        errors: 1
      });
    }
  };

  const startVoiceListening = async () => {
    try {
      console.log('Starting voice listening...');
      setIsListening(true);
      setFriendState('listening');
      
      audioRecorderRef.current = new AudioRecorder(
        processVoiceInput,
        (isActive) => {
          console.log('Voice activity:', isActive);
        }
      );
      
      await audioRecorderRef.current.start();
    } catch (error) {
      console.error('Error starting voice listening:', error);
      setIsListening(false);
      setFriendState('idle');
      
      const permissionMessage: Message = {
        id: Date.now().toString(),
        text: "I need microphone access to hear you! Please allow microphone permissions and try again.",
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, permissionMessage]);
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
      // Exit voice mode
      setIsVoiceMode(false);
      stopVoiceListening();
    } else {
      // Enter voice mode
      setIsVoiceMode(true);
      await startVoiceListening();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    await generateAIResponse(userMessage.text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleChatClick = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const handleClose = () => {
    setIsExpanded(false);
    setIsVoiceMode(false);
    stopVoiceListening();
    setFriendState('idle');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed state - Dynamic Avatar with chat button */}
      {!isExpanded && (
        <CollapsedAvatar
          friendState={friendState}
          isListening={isListening}
          isSyllableBlinking={isSyllableBlinking}
          onChatClick={handleChatClick}
          onVoiceToggle={handleVoiceToggle}
          onClose={handleClose}
          onSpeakText={speakText}
        />
      )}

      {/* Expanded state - Full chat interface */}
      {isExpanded && (
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
          onCollapse={handleCollapse}
          onClose={handleClose}
          onSpeakText={speakText}
        />
      )}
    </div>
  );
};

export default FriendAssistant;