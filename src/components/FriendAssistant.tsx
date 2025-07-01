
import { useState, useEffect } from 'react';
import { X, MessageCircle, Bot, Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface FriendAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  trigger?: 'social' | 'wallet' | 'data' | 'achievement';
}

type FriendState = 'idle' | 'listening' | 'thinking' | 'speaking';

const FriendAssistant = ({ isVisible, onClose, trigger }: FriendAssistantProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [friendState, setFriendState] = useState<FriendState>('idle');
  const [isListening, setIsListening] = useState(false);

  // Initialize with contextual greeting based on trigger
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      let greeting = "Hi there! I'm your IDIA Friend, here to help you navigate the platform! 👋";
      
      if (trigger === 'social') {
        greeting = "I see you're exploring the Social features! Need help connecting with friends or understanding trust scores? 🤝";
      } else if (trigger === 'wallet') {
        greeting = "Congratulations on your earnings! Want to know more about how IDIA rewards work? 💰";
      } else if (trigger === 'data') {
        greeting = "Great job connecting your data! This helps create a virtuous cycle that benefits everyone. 📊";
      } else if (trigger === 'achievement') {
        greeting = "Amazing work! You're making great progress on IDIA. Keep it up! 🎉";
      }

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
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      // Return to idle state after speaking
      setTimeout(() => {
        setFriendState('idle');
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

  // Get orb styling based on current state
  const getOrbStyling = () => {
    switch (friendState) {
      case 'idle':
        return {
          background: 'bg-gradient-to-r from-blue-400 to-blue-600',
          animation: 'animate-pulse',
          glow: 'shadow-lg shadow-blue-500/50',
          scale: 'scale-100'
        };
      case 'listening':
        return {
          background: 'bg-gradient-to-r from-purple-500 to-purple-700',
          animation: 'animate-[pulse_1s_ease-in-out_infinite]',
          glow: 'shadow-xl shadow-purple-500/60',
          scale: 'scale-110'
        };
      case 'thinking':
        return {
          background: 'bg-gradient-to-r from-gray-400 to-gray-600',
          animation: 'animate-spin',
          glow: 'shadow-lg shadow-gray-500/50',
          scale: 'scale-105'
        };
      case 'speaking':
        return {
          background: 'bg-gradient-to-r from-yellow-400 to-orange-500',
          animation: 'animate-[pulse_0.5s_ease-in-out_infinite]',
          glow: 'shadow-xl shadow-yellow-500/60',
          scale: 'scale-110'
        };
      default:
        return {
          background: 'bg-gradient-to-r from-blue-400 to-blue-600',
          animation: 'animate-pulse',
          glow: 'shadow-lg shadow-blue-500/50',
          scale: 'scale-100'
        };
    }
  };

  const orbStyle = getOrbStyling();

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed state - Dynamic Avatar with chat button */}
      {!isExpanded && (
        <div className="flex flex-col items-center space-y-2 animate-scale-in">
          {/* Dynamic State Orb */}
          <div className={`relative w-14 h-14 rounded-full ${orbStyle.background} ${orbStyle.animation} ${orbStyle.glow} ${orbStyle.scale} transition-all duration-300 flex items-center justify-center cursor-pointer`}>
            {/* Inner flame effect */}
            <div className={`w-8 h-8 rounded-full bg-white/30 ${orbStyle.animation} transition-all duration-300`}>
              <div className="w-full h-full rounded-full bg-white/20 animate-pulse"></div>
            </div>
            
            {/* State indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
              {friendState === 'listening' && <Mic className="w-2 h-2 text-purple-600" />}
              {friendState === 'thinking' && <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>}
              {friendState === 'speaking' && <div className="w-2 h-2 bg-yellow-600 rounded-full animate-ping"></div>}
              {friendState === 'idle' && <Bot className="w-2 h-2 text-blue-600" />}
            </div>
          </div>
          
          {/* Chat Button */}
          <Button
            onClick={handleChatClick}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Chat
          </Button>
          
          {/* Voice Button */}
          <Button
            onClick={handleVoiceToggle}
            size="sm"
            variant="outline"
            className={`${isListening ? 'bg-purple-100 border-purple-300' : ''} transition-colors`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          {/* Close button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Expanded state - Full chat interface */}
      {isExpanded && (
        <Card className="w-80 h-96 shadow-xl animate-scale-in">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Mini state orb in header */}
                <div className={`w-6 h-6 rounded-full ${orbStyle.background} ${orbStyle.animation} ${orbStyle.scale} transition-all duration-300 flex items-center justify-center`}>
                  <div className="w-3 h-3 rounded-full bg-white/40"></div>
                </div>
                <span className="font-semibold">IDIA Friend</span>
                <span className="text-xs opacity-75 capitalize">({friendState})</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="text-white hover:bg-white/20 p-1"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col h-80">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.isUser
                        ? 'bg-teal-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              
              {/* Thinking indicator */}
              {friendState === 'thinking' && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-lg rounded-bl-none p-3 text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about IDIA..."
                  className="flex-1"
                  disabled={friendState === 'thinking'}
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  className="bg-teal-500 hover:bg-teal-600"
                  disabled={friendState === 'thinking'}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleVoiceToggle}
                  size="sm"
                  variant="outline"
                  className={`${isListening ? 'bg-purple-100 border-purple-300' : ''}`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FriendAssistant;
