import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Wifi, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Zap,
  Shield
} from 'lucide-react';

interface NFCPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NFCPayrollModal: React.FC<NFCPayrollModalProps> = ({ isOpen, onClose }) => {
  const [connectionStep, setConnectionStep] = useState<'scanning' | 'connecting' | 'connected' | 'error'>('scanning');
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (isOpen) {
      setConnectionStep('scanning');
      setCountdown(30);
      
      // Simulate NFC scanning process
      const timer = setTimeout(() => {
        setConnectionStep('connecting');
        setTimeout(() => {
          // Randomly succeed or fail for demo purposes
          if (Math.random() > 0.3) {
            setConnectionStep('connected');
          } else {
            setConnectionStep('error');
          }
        }, 2000);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (connectionStep === 'scanning' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [connectionStep, countdown]);

  const handleRetry = () => {
    setConnectionStep('scanning');
    setCountdown(30);
  };

  const getStepContent = () => {
    switch (connectionStep) {
      case 'scanning':
        return (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 border-4 border-primary border-dashed rounded-full animate-pulse"></div>
              <div className="absolute inset-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Smartphone className="w-12 h-12 text-primary animate-bounce" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Looking for IDIA Pay App</h3>
              <p className="text-muted-foreground">
                Hold your device near the IDIA Pay terminal or another device with the IDIA Pay App
              </p>
              <Badge variant="outline" className="animate-pulse">
                Scanning... {countdown}s
              </Badge>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Wifi className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">NFC Instructions:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• Ensure NFC is enabled on your device</li>
                    <li>• Keep devices within 4cm of each other</li>
                    <li>• Don't move devices during connection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'connecting':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-32 h-32 relative">
              <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-green-50 rounded-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-700">Connecting to IDIA Pay</h3>
              <p className="text-muted-foreground">
                Establishing secure connection...
              </p>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connecting
              </Badge>
            </div>
          </div>
        );

      case 'connected':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-32 h-32 relative">
              <div className="absolute inset-0 border-4 border-green-500 rounded-full"></div>
              <div className="absolute inset-4 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-700">Connected Successfully!</h3>
                <p className="text-muted-foreground">
                  Ready to receive payroll via IDIA Pay
                </p>
              </div>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-green-800">Connection Details</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Shield className="w-3 h-3 mr-1" />
                      Encrypted
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Device ID:</span>
                      <span className="font-mono">IDIA-***7892</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connection Type:</span>
                      <span>NFC Secure</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="flex items-center">
                        <Zap className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-3">
                <Button onClick={onClose} className="flex-1">
                  Continue to Wallet
                </Button>
                <Button variant="outline" onClick={() => setConnectionStep('scanning')}>
                  New Connection
                </Button>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-32 h-32 relative">
              <div className="absolute inset-0 border-4 border-red-500 rounded-full"></div>
              <div className="absolute inset-4 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-red-700">Connection Failed</h3>
                <p className="text-muted-foreground">
                  Unable to connect to IDIA Pay App
                </p>
              </div>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-red-800 mb-2">Troubleshooting Tips:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Ensure both devices have NFC enabled</li>
                    <li>• Check that IDIA Pay App is running</li>
                    <li>• Move devices closer together</li>
                    <li>• Restart NFC if connection keeps failing</li>
                  </ul>
                </CardContent>
              </Card>

              <div className="flex space-x-3">
                <Button onClick={handleRetry} className="flex-1">
                  Try Again
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5" />
            <span>NFC Payroll Connection</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {getStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NFCPayrollModal;