import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, BrainCircuit, ShieldCheck } from "lucide-react";
import TestRunner from "./TestRunner";
import { TEST_BANK, type TestId } from "./testBank";
import { fireWelcomeConfetti, fireFinaleConfetti } from "./confetti";

interface PsychometricTestingCenterProps {
  onCompleteAll: (scores: Record<string, number>) => void;
}

const PsychometricTestingCenter: React.FC<PsychometricTestingCenterProps> = ({ onCompleteAll }) => {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(-1);
  const [completedModules, setCompletedModules] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Convert the TEST_BANK Record to an Array for indexed navigation
  const modules = Object.values(TEST_BANK);
  const totalModules = modules.length;

  useEffect(() => {
    fireWelcomeConfetti();
  }, []);

  const progress = (Object.keys(completedModules).length / totalModules) * 100;

  const startNextModule = () => {
    if (currentModuleIndex < totalModules - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      setIsFinished(true);
      fireFinaleConfetti();
      onCompleteAll(completedModules);
    }
  };

  const handleModuleComplete = (score: number) => {
    const currentModule = modules[currentModuleIndex];
    setCompletedModules((prev) => ({
      ...prev,
      [currentModule.id]: score,
    }));
    startNextModule();
  };

  const handleExit = () => {
    setCurrentModuleIndex(-1);
  };

  // Intro Screen - Mobile Optimized
  if (currentModuleIndex === -1) {
    return (
          <Card className="w-full max-w-sm border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 grid grid-cols-3 gap-2">
              {modules.map((test) => (
                <div key={test.id} className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <span className="text-[10px] text-muted-foreground uppercase truncate w-full px-1">{test.id}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="p-6 border-t bg-card/30">
          <Button
            onClick={() => setCurrentModuleIndex(0)}
            className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            Begin Validation <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Final Processing Screen
  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <ShieldCheck className="w-24 h-24 text-primary relative z-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold italic">Telemetry Secured.</h2>
          <p className="text-muted-foreground">Executing the IDIA Algorithm in the Secure Enclave...</p>
        </div>
      </div>
    );
  }

  const currentModule = modules[currentModuleIndex];

  return (
    <div className="flex flex-col h-[90vh] md:h-auto overflow-hidden bg-background">
      {/* Fixed Sticky Header */}
      <div className="px-4 pt-6 pb-4 border-b bg-background/80 backdrop-blur-md z-20">
        <div className="flex justify-between items-end mb-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Module {currentModuleIndex + 1} of {totalModules}
            </span>
            <h2 className="text-lg font-bold leading-tight">{currentModule.title}</h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Responsive Scrollable Content Frame */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              <TestRunner
                key={currentModule.id}
                test={currentModule}
                onComplete={handleModuleComplete}
                onExit={handleExit}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="h-4 bg-background border-t border-transparent" />
    </div>
  );
};

export default PsychometricTestingCenter;
