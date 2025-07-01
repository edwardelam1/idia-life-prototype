
import { useState, useEffect } from 'react';
import { X, MessageCircle, Bot, Send } from 'lucide-react';
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

const FriendAssistant = ({ isVisible, onClose, trigger }: FriendAssistantProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

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

    // Simulate AI response (in a real implementation, this would call an AI service)
    setTimeout(() => {
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
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleChatClick = () => {
    setIsExpanded(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed state - Avatar with chat button */}
      {!isExpanded && (
        <div className="flex flex-col items-center space-y-2 animate-scale-in">
          {/* Avatar */}
          <Avatar className="w-12 h-12 border-2 border-purple-500 shadow-lg">
            <AvatarImage src="/placeholder.svg" alt="IDIA Friend" />
            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
              IF
            </AvatarFallback>
          </Avatar>
          
          {/* Chat Button */}
          <Button
            onClick={handleChatClick}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg animate-pulse"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Chat
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
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/placeholder.svg" alt="IDIA Friend" />
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    IF
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold">IDIA Friend</span>
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
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  <Send className="w-4 h-4" />
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
