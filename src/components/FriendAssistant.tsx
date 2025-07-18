
import { useState, useEffect } from 'react';
import { Message, FriendAssistantProps, FriendState } from './FriendAssistant/types';
import { getContextualGreeting } from './FriendAssistant/orbUtils';
import { useSyllableBlinking } from './FriendAssistant/useSyllableBlinking';
import CollapsedAvatar from './FriendAssistant/CollapsedAvatar';
import ExpandedChat from './FriendAssistant/ExpandedChat';
import { supabase } from '@/integrations/supabase/client';

const FriendAssistant = ({ isVisible, onClose, trigger }: FriendAssistantProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>('');

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
        audio.onended = () => console.log('Audio finished playing');
        audio.onerror = (e) => console.error('Audio playback error:', e);
        
        // Set volume to ensure it's audible
        audio.volume = 0.8;
        
        await audio.play();
        console.log('Audio play() called successfully');
      } else {
        console.error('No audio content received from text-to-speech function');
      }
    } catch (error) {
      console.error('Error playing speech:', error);
      
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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Set thinking state
    setFriendState('thinking');

    // Simulate AI response with state transitions
    setTimeout(() => {
      setFriendState('speaking');
      
      const responses = [
        "That's a great question! Let me help you with that.",
        "I understand what you're looking for. Here's what I know about that topic.",
        "Thanks for asking! IDIA is designed to make data sharing beneficial for everyone.",
        "Great observation! The trust system helps build stronger communities.",
        "That's exactly the kind of thinking that makes IDIA special!"
      ];
      
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      setCurrentSpeechText(responseText); // Set the text for syllable blinking
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      // Speak the response using ElevenLabs
      speakText(responseText);

      // Return to idle state after speaking
      setTimeout(() => {
        setFriendState('idle');
        setCurrentSpeechText(''); // Clear speech text
      }, 3000);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleChatClick = () => {
    setIsExpanded(true);
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      setIsListening(false);
      setFriendState('thinking');
      // Simulate processing voice input
      setTimeout(() => {
        setFriendState('idle');
      }, 1000);
    } else {
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Stop the stream immediately since we're just checking permissions
        stream.getTracks().forEach(track => track.stop());
        
        setIsListening(true);
        setFriendState('listening');
        
        console.log('Microphone permission granted');
      } catch (error) {
        console.error('Microphone permission denied or not available:', error);
        
        // Show a friendly message instead of just failing silently
        const permissionMessage: Message = {
          id: Date.now().toString(),
          text: "I need microphone access to hear you! Please allow microphone permissions and try again.",
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, permissionMessage]);
        setFriendState('idle');
      }
    }
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const handleClose = () => {
    setIsExpanded(false);
    setIsListening(false);
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
