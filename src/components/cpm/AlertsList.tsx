import { Alert } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertsListProps {
  alerts: Alert[];
}

const AlertsList = ({ alerts }: AlertsListProps) => {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      case 'critical': return XCircle;
      case 'success': return CheckCircle;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'warning': return 'text-yellow-500 bg-yellow-500/10';
      case 'info': return 'text-blue-500 bg-blue-500/10';
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'success': return 'text-emerald-500 bg-emerald-500/10';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4 text-primary" />
          CPM Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
        ) : (
          alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <div 
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  getAlertColor(alert.type),
                  !alert.isRead && "ring-1 ring-primary/20"
                )}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {getTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsList;
