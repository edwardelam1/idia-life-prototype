import React, { useState, useEffect } from 'react';
import AuthSelection from './onboarding/AuthSelection';
import FlashingSplashScreen from './FlashingSplashScreen';
// Import other components: AgeAssurance, DigitalWard, WalletGen, Goals, Consent, WalletDashboard

type OnboardingStep = 
  | 'AUTH' 
  | 'AGE_ASSURANCE' 
  | 'DIGITAL_WARD' 
  | 'PROOF_OF_LIFE' 
  | 'WALLET_GEN' 
  | 'GOALS' 
  | 'CONSENT' 
  | 'DASHBOARD';

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('AUTH');
  const [userData, setUserData] = useState({
    isMinor: false,
    guardianEmail: '',
    polVerified: false,
    acaRecordId: null,
  });

  // HCD Compliance: Minor Routing Logic 
  const handleAgeSubmit = (age: number) => {
    if (age < 18) {
      setUserData(prev => ({ ...prev, isMinor: true }));
      setCurrentStep('DIGITAL_WARD');
    } else {
      setUserData(prev => ({ ...prev, isMinor: false }));
      setCurrentStep('PROOF_OF_LIFE');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'AUTH':
        return <AuthSelection onNext={() => setCurrentStep('AGE_ASSURANCE')} />;
      case 'AGE_ASSURANCE':
        // Placeholder for your Age component
        return (
          <div className="flex flex-col items-center justify-center h-screen bg-[#0a0f1a] text-white">
             <h2 className="text-2xl font-bold mb-4 text-[#d4af37]">Verify your Age</h2>
             {/* Simplified for demonstration */}
             <button onClick={() => handleAgeSubmit(25)} className="bg-[#4f8aff] p-3 rounded mb-2">I am 18+</button>
             <button onClick={() => handleAgeSubmit(16)} className="bg-red-500 p-3 rounded">I am Under 18</button>
          </div>
        );
      case 'DIGITAL_WARD':
        return (
          <div className="flex flex-col items-center justify-center h-screen bg-[#0a0f1a] text-white">
            <h2 className="text-2xl font-bold mb-2 text-red-500">Digital Ward Protocol</h2>
            <p className="mb-4">Guardian consent is required.</p>
            {/* Logic to trigger send_guardian_invite via AWS SES  */}
            <button onClick={() => setCurrentStep('AGE_ASSURANCE')} className="border border-white p-2 rounded">Back</button>
          </div>
        );
      case 'PROOF_OF_LIFE':
        return (
          <FlashingSplashScreen 
            onVerificationComplete={() => {
              setUserData(prev => ({ ...prev, polVerified: true }));
              setCurrentStep('WALLET_GEN');
            }} 
          />
        );
      case 'WALLET_GEN':
        // Automatically transitions after generating Capacitor Secure Storage keys 
        setTimeout(() => setCurrentStep('GOALS'), 2000);
        return <div className="h-screen bg-[#0a0f1a] text-[#4f8aff] flex items-center justify-center">Generating Secure Vault...</div>;
      case 'GOALS':
        return <button onClick={() => setCurrentStep('CONSENT')}>Set Goals {'->'} Next</button>;
      case 'CONSENT':
        return <button onClick={() => setCurrentStep('DASHBOARD')}>Generate ACA {'->'} Finish</button>;
      case 'DASHBOARD':
        return <div className="h-screen bg-[#0a0f1a] text-[#d4af37] flex items-center justify-center text-3xl">Wallet Dashboard</div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] font-sans">
      {renderStep()}
    </div>
  );
}