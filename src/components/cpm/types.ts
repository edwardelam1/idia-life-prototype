// CPM Module Types - Simulated Data Types

export interface HRIScore {
  score: number;
  status: 'optimal' | 'good' | 'moderate' | 'low' | 'critical';
  lastUpdated: Date;
  trend: 'up' | 'down' | 'stable';
}

export interface BiometricReading {
  id: string;
  type: 'hrv' | 'sleep' | 'reaction_time' | 'heart_rate' | 'stress' | 'recovery';
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  validationTier: 'clinical' | 'consumer' | 'unvalidated';
}

export interface PatternOfLife {
  geoVelocity: number;
  circadianBaseline: number;
  deviceFingerprint: string;
  anomalyScore: number;
  lastUpdate: Date;
}

export interface SecurityProtocol {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'triggered' | 'disabled';
  description: string;
  icon: string;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  category: 'cognitive' | 'physical' | 'recovery' | 'occupational';
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'critical' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export interface SubscriptionTier {
  id: 'life-pro' | 'pro-plus' | 'pure-alpha';
  name: string;
  price: string;
  description: string;
  features: string[];
  isActive: boolean;
}
