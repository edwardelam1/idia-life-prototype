
import { FriendState, OrbStyling } from './types';

export const getOrbStyling = (friendState: FriendState): OrbStyling => {
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

export const getContextualGreeting = (trigger?: 'social' | 'wallet' | 'data' | 'achievement'): string => {
  if (trigger === 'social') {
    return "I see you're exploring the Social features! Need help connecting with friends or understanding trust scores? 🤝";
  } else if (trigger === 'wallet') {
    return "Congratulations on your earnings! Want to know more about how IDIA rewards work? 💰";
  } else if (trigger === 'data') {
    return "Great job connecting your data! This helps create a virtuous cycle that benefits everyone. 📊";
  } else if (trigger === 'achievement') {
    return "Amazing work! You're making great progress on IDIA. Keep it up! 🎉";
  }
  
  return "Hi there! I'm your IDIA Friend, here to help you navigate the platform! 👋";
};
