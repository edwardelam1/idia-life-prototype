import HRIScoreCard from './HRIScoreCard';
import BiometricsGrid from './BiometricsGrid';
import PatternOfLifeCard from './PatternOfLifeCard';
import SecurityProtocolsPanel from './SecurityProtocolsPanel';
import PerformanceMetricsCard from './PerformanceMetricsCard';
import AlertsList from './AlertsList';
import {
  mockHRIScore,
  mockBiometrics,
  mockPatternOfLife,
  mockSecurityProtocols,
  mockPerformanceMetrics,
  mockAlerts
} from './mockData';

const CPMDashboard = () => {
  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-xl font-bold">Cognitive Performance</h1>
        <p className="text-sm text-muted-foreground">
          Bio-sovereign intelligence engine
        </p>
      </div>

      {/* HRI Score - Primary Focus */}
      <HRIScoreCard hriScore={mockHRIScore} />

      {/* Biometrics Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
          Live Biometrics
        </h2>
        <BiometricsGrid biometrics={mockBiometrics} />
      </div>

      {/* Pattern of Life */}
      <PatternOfLifeCard pol={mockPatternOfLife} />

      {/* Performance Metrics */}
      <PerformanceMetricsCard metrics={mockPerformanceMetrics} />

      {/* Security Protocols */}
      <SecurityProtocolsPanel protocols={mockSecurityProtocols} />

      {/* Alerts */}
      <AlertsList alerts={mockAlerts} />
    </div>
  );
};

export default CPMDashboard;
