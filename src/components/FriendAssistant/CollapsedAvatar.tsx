
import { X, MessageCircle, Bot, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FriendState } from './types';
import { getOrbStyling } from './orbUtils';

interface CollapsedAvatarProps {
  friendState: FriendState;
  isListening: boolean;
  isSyllableBlinking?: boolean;
  onChatClick: () => void;
  onVoiceToggle: () => void;
  onClose: () => void;
  onSpeakText: (text: string) => void;
}

const CollapsedAvatar = ({
  friendState,
  isListening,
  isSyllableBlinking,
  onChatClick,
  onVoiceToggle,
  onClose,
  onSpeakText
}: CollapsedAvatarProps) => {
  const orbStyle = getOrbStyling(friendState, isSyllableBlinking);

  return (
    <div className="flex flex-col items-center space-y-2 animate-scale-in">
      {/* Dynamic State Orb - Now clickable for voice activation with mystical smoky appearance */}
      <div 
        className={`relative w-14 h-14 rounded-full ${orbStyle.background} ${orbStyle.animation} ${orbStyle.glow} ${orbStyle.scale} transition-all duration-500 flex items-center justify-center cursor-pointer hover:scale-110 border border-white/20`}
        onClick={onVoiceToggle}
      >
        {/* Mystical inner layers for smoky effect */}
        <div className="absolute inset-2 rounded-full bg-white/10 blur-[1px]">
          <div className="w-full h-full rounded-full bg-gradient-radial from-white/20 via-transparent to-transparent"></div>
        </div>
        <div className="absolute inset-3 rounded-full bg-white/5 blur-[2px]">
          <div className="w-full h-full rounded-full bg-gradient-radial from-white/15 via-transparent to-transparent"></div>
        </div>
        
        {/* Core mystical center */}
        <div className="relative w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm">
          <div className="absolute inset-1 rounded-full bg-white/10"></div>
        </div>
        
        {/* State is communicated by the orb's color/animation — no icon badges */}
      </div>
      
      {/* Chat Button */}
      <Button
        onClick={onChatClick}
        size="sm"
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        Chat
      </Button>
      
      {/* Voice Status Button */}
      <Button
        onClick={onVoiceToggle}
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
  );
};

export default CollapsedAvatar;
