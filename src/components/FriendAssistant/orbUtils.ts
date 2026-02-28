
import { FriendState, OrbStyling } from './types';

export const getOrbStyling = (friendState: FriendState, isBlinking?: boolean): OrbStyling => {
  switch (friendState) {
    case 'idle':
      return {
        background: 'bg-gradient-radial from-blue-300/80 via-blue-500/60 to-blue-800/90',
        animation: 'animate-[pulse_5s_ease-in-out_infinite]', // Slowed down by 2/3 (from ~2s to 5s)
        glow: 'shadow-2xl shadow-blue-400/40 backdrop-blur-sm',
        scale: 'scale-100'
      };
    case 'listening':
      return {
        background: 'bg-gradient-radial from-purple-300/80 via-purple-500/60 to-purple-800/90',
        animation: 'animate-pulse',
        glow: 'shadow-2xl shadow-purple-400/50 backdrop-blur-sm',
        scale: 'scale-110'
      };
    case 'thinking':
      return {
        background: 'bg-gradient-radial from-gray-300/70 via-gray-500/50 to-gray-700/80',
        animation: 'animate-spin',
        glow: 'shadow-2xl shadow-gray-400/30 backdrop-blur-sm',
        scale: 'scale-105'
      };
    case 'speaking':
      return {
        background: 'bg-gradient-radial from-yellow-300/80 via-orange-400/60 to-orange-600/90',
        animation: isBlinking ? 'animate-pulse' : '', // Dynamic blinking based on syllables
        glow: 'shadow-2xl shadow-yellow-400/50 backdrop-blur-sm',
        scale: 'scale-110'
      };
    default:
      return {
        background: 'bg-gradient-radial from-blue-300/80 via-blue-500/60 to-blue-800/90',
        animation: 'animate-[pulse_5s_ease-in-out_infinite]',
        glow: 'shadow-2xl shadow-blue-400/40 backdrop-blur-sm',
        scale: 'scale-100'
      };
  }
};

export const getContextualGreeting = (trigger?: 'social' | 'wallet' | 'data' | 'achievement' | 'onboarding'): string => {
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
