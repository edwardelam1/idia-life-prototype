// CPM Module - Simulated Data

import { 
  HRIScore, 
  BiometricReading, 
  PatternOfLife, 
  SecurityProtocol, 
  PerformanceMetric, 
  Alert,
  SubscriptionTier 
} from './types';

export const mockHRIScore: HRIScore = {
  score: 87,
  status: 'optimal',
  lastUpdated: new Date(),
  trend: 'up'
};

export const mockBiometrics: BiometricReading[] = [
  {
    id: '1',
    type: 'hrv',
    value: 65,
    unit: 'ms',
    timestamp: new Date(),
    source: 'Apple Watch',
    validationTier: 'clinical'
  },
  {
    id: '2',
    type: 'sleep',
    value: 7.5,
    unit: 'hours',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    source: 'Apple Health',
    validationTier: 'consumer'
  },
  {
    id: '3',
    type: 'reaction_time',
    value: 245,
    unit: 'ms',
    timestamp: new Date(),
    source: 'IDIA CPM Test',
    validationTier: 'clinical'
  },
  {
    id: '4',
    type: 'heart_rate',
    value: 68,
    unit: 'bpm',
    timestamp: new Date(),
    source: 'Apple Watch',
    validationTier: 'clinical'
  },
  {
    id: '5',
    type: 'stress',
    value: 32,
    unit: '%',
    timestamp: new Date(),
    source: 'IDIA Synapse',
    validationTier: 'consumer'
  },
  {
    id: '6',
    type: 'recovery',
    value: 85,
    unit: '%',
    timestamp: new Date(),
    source: 'IDIA Analysis',
    validationTier: 'consumer'
  }
];

export const mockPatternOfLife: PatternOfLife = {
  geoVelocity: 2.3,
  circadianBaseline: 0.92,
  deviceFingerprint: 'IDIA-D7X9-A3F2',
  anomalyScore: 0.12,
  lastUpdate: new Date()
};

export const mockSecurityProtocols: SecurityProtocol[] = [
  {
    id: 'bio-sovereign',
    name: 'Bio-Sovereign Auth',
    status: 'active',
    description: 'Pattern of Life verification active',
    icon: 'Shield'
  },
  {
    id: 'ghost-protocol',
    name: 'Ghost Protocol',
    status: 'standby',
    description: 'Duress detection ready',
    icon: 'Ghost'
  },
  {
    id: 'digital-ward',
    name: 'Digital Ward',
    status: 'disabled',
    description: 'Minor protection (N/A)',
    icon: 'Baby'
  },
  {
    id: 'silver-sentinel',
    name: 'Silver Sentinel',
    status: 'disabled',
    description: 'Elder protection (N/A)',
    icon: 'Heart'
  },
  {
    id: 'aegis-protocol',
    name: 'Aegis Protocol',
    status: 'standby',
    description: 'Anti-abuse shield ready',
    icon: 'ShieldCheck'
  },
  {
    id: 'hitchhiker',
    name: 'Hitchhiker Detection',
    status: 'active',
    description: 'Passive BLE scanning',
    icon: 'Radio'
  }
];

export const mockPerformanceMetrics: PerformanceMetric[] = [
  {
    id: '1',
    name: 'Cognitive Endurance',
    value: 78,
    target: 85,
    unit: '%',
    category: 'cognitive'
  },
  {
    id: '2',
    name: 'Focus Duration',
    value: 45,
    target: 60,
    unit: 'min',
    category: 'cognitive'
  },
  {
    id: '3',
    name: 'Recovery Score',
    value: 85,
    target: 80,
    unit: '%',
    category: 'recovery'
  },
  {
    id: '4',
    name: 'Injury Risk',
    value: 15,
    target: 20,
    unit: '%',
    category: 'physical'
  },
  {
    id: '5',
    name: 'Reliability Streak',
    value: 23,
    target: 30,
    unit: 'days',
    category: 'occupational'
  },
  {
    id: '6',
    name: 'Neural Drive',
    value: 92,
    target: 85,
    unit: '%',
    category: 'cognitive'
  }
];

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'success',
    title: 'HRI Optimal',
    message: 'Your cognitive readiness is at peak performance today.',
    timestamp: new Date(),
    isRead: false
  },
  {
    id: '2',
    type: 'info',
    title: 'Recovery Complete',
    message: 'Sleep analysis shows full recovery from yesterday\'s activity.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: '3',
    type: 'warning',
    title: 'Focus Decline Detected',
    message: 'You\'re entering hour 6 of focus work. Consider a 15-min break.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    isRead: false
  }
];

export const mockSubscriptionTiers: SubscriptionTier[] = [
  {
    id: 'life-pro',
    name: 'IDIA Life Pro',
    price: '$9.99/mo',
    description: 'Essential cognitive performance tracking',
    features: [
      'Real-time HRI Score',
      'Basic biometric tracking',
      'Pattern of Life monitoring',
      'Sleep & recovery analysis',
      'Daily performance insights'
    ],
    isActive: false
  },
  {
    id: 'pro-plus',
    name: 'IDIA Pro+',
    price: '$29.99/mo',
    description: 'Advanced occupational performance engine',
    features: [
      'Everything in Life Pro',
      'Occupational role baselines',
      'Recovery-to-exertion ratio',
      'Cognitive endurance gauge',
      'Reliability streak tracking',
      'Weekly AI performance reports',
      'Injury risk prediction'
    ],
    isActive: true
  },
  {
    id: 'pure-alpha',
    name: 'Pure Alpha',
    price: '$99.99/mo',
    description: 'Executive-grade performance intelligence',
    features: [
      'Everything in Pro+',
      'P&L to HRI correlation',
      'Team performance analytics',
      'Enterprise SLA integrations',
      'Custom baseline templates',
      'Real-time workforce insights',
      'Priority clinical validation'
    ],
    isActive: false
  }
];
