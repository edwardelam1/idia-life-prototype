import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Activity, Heart, CheckCircle2, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { TEST_BANK, PILLARS, TestId } from "./testBank";
import TestRunner from "./TestRunner";
import { fireFinaleConfetti } from "./confetti";

interface PsychometricTestingCenterProps {
  existingScores?: Partial<Record<TestId, number>>;
  onCompleteAll: (scores: Record<TestId, number>) => Promise<void> | void;
}

const PILLAR_META = {
  "Social Connectivity Index": {
    icon: Users,
    accent: "text-teal-500",
    border: "border-teal-500/30",
    bg: "from-teal-500/10",
  },
  "Work Engagement Index": {
    icon: Activity,
    accent: "text-orange-500",
    border: "border-orange-500/30",
    bg: "from-orange-500/10",
  },
  "Prosocial Disposition Index": {
    icon: Heart,
    accent: "text-teal-600",
    border: "border-teal-600/30",
    bg: "from-teal-600/10",
  },
} as const;

const PsychometricTestingCenter: React.FC<PsychometricTestingCenterProps> = ({
  existingScores = {},
  onCompleteAll,
}) => {
  const [activeTestId, setActiveTestId] = useState<TestId | null>(null);
  const [scores, setScores] = useState<Partial<Record<TestId, number>>>(existingScores);
  const [finalizing, setFinalizing] = useState(false);

  const completedCount = Object.keys(scores).length;
  const isFullyComplete = completedCount === 9;
  const overallProgress = (completedCount / 9) * 100;

  const handleTestComplete = async (score: number) => {
    if (!activeTestId) return;
    const next = { ...scores, [activeTestId]: score };
    setScores(next);
    setActiveTestId(null);

    if (Object.keys(next).length === 9) {
      setFinalizing(true);
      fireFinaleConfetti();
      await onCompleteAll(next as Record<TestId, number>);
      setFinalizing(false);
    }
  };

  // ---------- ACTIVE TEST ----------
  if (activeTestId) {
    return (
      <TestRunner test={TEST_BANK[activeTestId]} onExit={() => setActiveTestId(null)} onComplete={handleTestComplete} />
    );
  }

  // ---------- DASHBOARD ----------
  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Trust Matrix Validation</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            Complete the 9 telemetry modules to establish your capital advancement limits. Processed locally in your
            Secure Enclave.
          </p>
        </div>

        {/* Overall progress */}
        <div className="bg-muted/30 border rounded-xl p-3 max-w-sm mx-auto">
          <div className="flex justify-between text-xs font-medium mb-2">
            <span className="text-muted-foreground">Validation Progress</span>
            <span className="text-teal-600">
              {completedCount} / 9 ({Math.round(overallProgress)}%)
            </span>
          </div>
          <Progress
            value={overallProgress}
            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-teal-500 [&>div]:to-orange-500"
          />
        </div>
      </div>

      {/* Pillars */}
      <div className="space-y-4">
        {PILLARS.map((pillar) => {
          const meta = PILLAR_META[pillar.name as keyof typeof PILLAR_META];
          const Icon = meta.icon;
          const pillarComplete = pillar.keys.filter((k) => scores[k as TestId] !== undefined).length;

          return (
            <div
              key={pillar.name}
              className={`rounded-xl border ${meta.border} bg-gradient-to-br ${meta.bg} to-transparent p-4 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${meta.accent}`} />
                  <h3 className="font-bold text-sm">{pillar.name}</h3>
                </div>
                <span className="text-xs font-bold text-muted-foreground">
                  {pillarComplete}/{pillar.keys.length} • {Math.round(pillar.weight * 100)}%
                </span>
              </div>

              <div className="space-y-2">
                {pillar.keys.map((key) => {
                  const test = TEST_BANK[key as TestId];
                  const isComplete = scores[key as TestId] !== undefined;
                  return (
                    <button
                      key={key}
                      onClick={() => !isComplete && setActiveTestId(key as TestId)}
                      disabled={isComplete}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isComplete
                          ? "bg-teal-500/5 border-teal-500/30 cursor-default"
                          : "bg-card border-border hover:border-orange-500/50 hover:shadow-md hover:shadow-orange-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{test.title}</p>
                            {isComplete && <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{test.description}</p>
                        </div>
                        {isComplete ? (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
                            <p className="font-bold bg-gradient-to-r from-teal-500 to-orange-500 bg-clip-text text-transparent">
                              {scores[key as TestId]}
                            </p>
                          </div>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-orange-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Finalize */}
      {isFullyComplete && (
        <div className="sticky bottom-0 bg-background pt-2 pb-1">
          <Button
            onClick={() => onCompleteAll(scores as Record<TestId, number>)}
            disabled={finalizing}
            className="w-full h-12 bg-gradient-to-r from-teal-500 via-teal-600 to-orange-500 hover:opacity-90 text-white font-bold shadow-lg shadow-orange-500/30"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {finalizing ? "Calculating Cryptographic Limits..." : "All Modules Complete — Finalize"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PsychometricTestingCenter;
