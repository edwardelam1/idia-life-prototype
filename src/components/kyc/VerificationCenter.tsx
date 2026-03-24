import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import BiometricLiveness from './BiometricLiveness';
import VerificationSuccess from './VerificationSuccess';
import type { KYCStatus } from '@/hooks/useKYCStatus';

interface VerificationCenterProps {
  kycStatus: KYCStatus;
  onStartVerification: () => void;
  onDocumentSubmit: (docType: string) => Promise<void>;
  onLivenessComplete: () => Promise<void>;
  onSimulateVerification: () => Promise<void>;
  onBack: () => void;
}

const VerificationCenter: React.FC<VerificationCenterProps> = ({
  kycStatus,
  onDocumentSubmit,
  onLivenessComplete,
  onSimulateVerification,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState<'overview' | 'document' | 'liveness' | 'success'>('overview');
  const [documentComplete, setDocumentComplete] = useState(false);

  const stepProgress = currentStep === 'overview' ? 0 
    : currentStep === 'document' ? 33 
    : currentStep === 'liveness' ? 66 
    : 100;

  const handleDocumentSubmit = async (docType: string) => {
    await onDocumentSubmit(docType);
    setDocumentComplete(true);
    setCurrentStep('liveness');
  };

  const handleLivenessComplete = async () => {
    await onLivenessComplete();
    setCurrentStep('success');
  };

  const handleSuccessDone = async () => {
    await onSimulateVerification();
    onBack();
  };

  if (currentStep === 'document') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep('overview')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Step 1 of 3</p>
            <Progress value={stepProgress} className="h-1.5 mt-1" />
          </div>
        </div>
        <DocumentUpload onSubmit={handleDocumentSubmit} />
      </div>
    );
  }

  if (currentStep === 'liveness') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep('document')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Step 2 of 3</p>
            <Progress value={stepProgress} className="h-1.5 mt-1" />
          </div>
        </div>
        <BiometricLiveness onComplete={handleLivenessComplete} />
      </div>
    );
  }

  if (currentStep === 'success') {
    return <VerificationSuccess onDone={handleSuccessDone} />;
  }

  // Overview screen
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-bold text-foreground">Verification Center</h2>
      </div>

      {/* Progress */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Identity Verification</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            We're keeping your account safe. Complete these steps to unlock full access.
          </p>
          <div className="space-y-2">
            {['Identity Documents', 'Biometric Liveness', 'Review & Approval'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <span className="text-sm text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tier comparison */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Account Tier Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Feature</TableHead>
                <TableHead className="text-xs text-center">Basic</TableHead>
                <TableHead className="text-xs text-center">Verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs font-medium">Deposit Limit</TableCell>
                <TableCell className="text-xs text-center">$1,000</TableCell>
                <TableCell className="text-xs text-center font-semibold text-primary">Unlimited</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Withdrawals</TableCell>
                <TableCell className="text-xs text-center">
                  <Badge variant="secondary" className="text-[10px]">Locked</Badge>
                </TableCell>
                <TableCell className="text-xs text-center">
                  <Badge className="text-[10px] bg-primary">Enabled</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Trading</TableCell>
                <TableCell className="text-xs text-center">
                  <Badge variant="secondary" className="text-[10px]">Locked</Badge>
                </TableCell>
                <TableCell className="text-xs text-center">
                  <Badge className="text-[10px] bg-primary">Enabled</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Support</TableCell>
                <TableCell className="text-xs text-center">Standard</TableCell>
                <TableCell className="text-xs text-center font-semibold text-primary">Priority</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-xs font-medium">Data Rewards</TableCell>
                <TableCell className="text-xs text-center">1x</TableCell>
                <TableCell className="text-xs text-center font-semibold text-primary">2x Multiplier</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button 
        className="w-full bg-primary hover:bg-primary/90"
        onClick={() => setCurrentStep('document')}
      >
        <Shield className="w-4 h-4 mr-2" />
        Verify Identity
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};

export default VerificationCenter;
