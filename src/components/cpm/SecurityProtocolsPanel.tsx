import { SecurityProtocol } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Ghost, 
  Baby, 
  Heart, 
  ShieldCheck, 
  Radio,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityProtocolsPanelProps {
  protocols: SecurityProtocol[];
}

const SecurityProtocolsPanel = ({ protocols }: SecurityProtocolsPanelProps) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return Shield;
      case 'Ghost': return Ghost;
      case 'Baby': return Baby;
      case 'Heart': return Heart;
      case 'ShieldCheck': return ShieldCheck;
      case 'Radio': return Radio;
      default: return Lock;
    }
  };

  const getStatusBadge = (status: SecurityProtocol['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]">Active</Badge>;
      case 'standby':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-[10px]">Standby</Badge>;
      case 'triggered':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px] animate-pulse">Triggered</Badge>;
      case 'disabled':
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">N/A</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="w-4 h-4 text-primary" />
          Security Protocols
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {protocols.map((protocol) => {
          const Icon = getIcon(protocol.icon);
          return (
            <div 
              key={protocol.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-colors",
                protocol.status === 'active' ? 'bg-emerald-500/5' :
                protocol.status === 'triggered' ? 'bg-red-500/5' :
                'bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "w-4 h-4",
                  protocol.status === 'active' ? 'text-emerald-500' :
                  protocol.status === 'triggered' ? 'text-red-500' :
                  protocol.status === 'standby' ? 'text-blue-500' :
                  'text-muted-foreground'
                )} />
                <div>
                  <p className="text-sm font-medium">{protocol.name}</p>
                  <p className="text-xs text-muted-foreground">{protocol.description}</p>
                </div>
              </div>
              {getStatusBadge(protocol.status)}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SecurityProtocolsPanel;
