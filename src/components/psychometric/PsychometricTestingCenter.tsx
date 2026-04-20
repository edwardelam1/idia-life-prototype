import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Info } from "lucide-react";
import TestRunner from "./TestRunner";
import { TEST_BANK, type TestId } from "./testBank";
import { fireWelcomeConfetti, fireFinaleConfetti } from "./confetti";

interface PsychometricTestingCenterProps {
  onCompleteAll: (scores: Record<string, number>) => void;
}

const PsychometricTestingCenter: React.FC<PsychometricTestingCenterProps> = ({ onCompleteAll }) => {
  // FIXED: Starts at index 0 which is now the "How to IDIA" Tutorial
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);

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

      // Filter out the tutorial score before sending to the Edge Function
      const { tut, ...actualTelemetry } = completedModules;
      onCompleteAll(actualTelemetry);
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
    // Standard exit logic
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center space-y-6 bg-white">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500/10 blur-2xl rounded-full" />
          <ShieldCheck className="w-24 h-24 text-teal-600 relative z-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold italic text-foreground">Telemetry Secured.</h2>
          <p className="text-muted-foreground">Executing the IDIA Algorithm in the Secure Enclave...</p>
        </div>
      </div>
    );
  }

  const currentModule = modules[currentModuleIndex];
  const isTutorial = currentModule.id === "tut";

  return (
    <div className="flex flex-col h-[90vh] md:h-auto overflow-hidden bg-white">
      {/* Fixed Sticky Header */}
      <div className="px-4 pt-6 pb-4 border-b bg-white/80 backdrop-blur-md z-20">
        <div className="flex justify-between items-end mb-2">
          <div className="space-y-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${isTutorial ? "text-orange-500" : "text-teal-600"}`}
            >
              {isTutorial ? "Training Module" : `Module ${currentModuleIndex} of ${totalModules - 1}`}
            </span>
            <h2 className="text-lg font-bold leading-tight text-foreground">{currentModule.title}</h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className={`h-1.5 ${isTutorial ? "bg-orange-100" : "bg-teal-100"}`} />

        {isTutorial && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-3">
            <Info className="w-4 h-4 text-orange-500 mt-0.5" />
            <p className="text-[11px] text-orange-800 leading-tight">
              <strong>Quick Tip:</strong> Use the buttons below to rate how much you agree with each statement. Be
              honest—the algorithm rewards consistency and truth, not high scores.
            </p>
          </div>
        )}
      </div>

      {/* Responsive Scrollable Content Frame */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-white">
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

      <div className="h-4 bg-white border-t border-transparent" />
    </div>
  );
};

export default PsychometricTestingCenter;
