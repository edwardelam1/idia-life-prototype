import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, AlertTriangle, RefreshCw, TrendingUp, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PipelineHealth {
  total_raw_data: number;
  unprocessed_raw_data: number;
  processed_raw_data: number;
  total_staged_data: number;
  total_transactions: number;
}

const PipelineHealthMonitor = () => {
  const [health, setHealth] = useState<PipelineHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchPipelineHealth();
    const interval = setInterval(fetchPipelineHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineHealth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("pipeline-diagnostics");

      if (error) {
        console.error("Pipeline health check failed:", error);
        return;
      }

      if (data?.diagnostics?.pipeline_health) {
        setHealth(data.diagnostics.pipeline_health);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error fetching pipeline health:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScore = () => {
    if (!health) return 0;

    const totalData = health.total_raw_data;
    if (totalData === 0) return 100;

    const processedRate = (health.processed_raw_data / totalData) * 100;
    const unprocessedPenalty = (health.unprocessed_raw_data / totalData) * 50;

    return Math.max(0, Math.min(100, processedRate - unprocessedPenalty));
  };

  const getHealthStatus = () => {
    const score = getHealthScore();
    if (score >= 90) return { status: "excellent", color: "text-green-600", bg: "bg-green-100" };
    if (score >= 70) return { status: "good", color: "text-blue-600", bg: "bg-blue-100" };
    if (score >= 50) return { status: "fair", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { status: "poor", color: "text-red-600", bg: "bg-red-100" };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Pipeline Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Pipeline Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Unable to load pipeline health data</p>
          <Button onClick={fetchPipelineHealth} variant="outline" className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const healthStatus = getHealthStatus();
  const healthScore = getHealthScore();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Pipeline Health</span>
          </CardTitle>
          <Badge className={`${healthStatus.bg} ${healthStatus.color} border-0`}>
            {healthScore.toFixed(0)}% {healthStatus.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Data</span>
              <span className="font-semibold">{health.total_raw_data}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Processed</span>
              <span className="font-semibold text-green-600">{health.processed_raw_data}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-semibold text-orange-600">{health.unprocessed_raw_data}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Staged Data</span>
              <span className="font-semibold">{health.total_staged_data}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Transactions</span>
              <span className="font-semibold text-blue-600">{health.total_transactions}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Last updated</span>
            <span className="text-gray-500">{lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>

        {health.unprocessed_raw_data > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-800">{health.unprocessed_raw_data} items awaiting processing</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineHealthMonitor;
