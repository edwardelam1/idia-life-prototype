import { useState, useEffect } from 'react';
import { Message, FriendAssistantProps, FriendState } from './FriendAssistant/types';
import { getContextualGreeting } from './FriendAssistant/orbUtils';
import { useSyllableBlinking } from './FriendAssistant/useSyllableBlinking';
import CollapsedAvatar from './FriendAssistant/CollapsedAvatar';
import ExpandedChat from './FriendAssistant/ExpandedChat';

const FriendAssistant = ({ isVisible, onClose, trigger }: FriendAssistantProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>('');

  // Use syllable blinking hook
  const isSyllableBlinking = useSyllableBlinking(
    friendState === 'speaking',
    currentSpeechText
  );

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

      // Return to idle state after speaking
      setTimeout(() => {
        setFriendState('idle');
        setCurrentSpeechText(''); // Clear speech text
      }, 2000);
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

  const handleVoiceToggle = () => {
    if (isListening) {
      setIsListening(false);
      setFriendState('thinking');
      // Simulate processing voice input
      setTimeout(() => {
        setFriendState('idle');
      }, 1000);
    } else {
      setIsListening(true);
      setFriendState('listening');
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
        />
      )}
    </div>
  );
};

export default FriendAssistant;
