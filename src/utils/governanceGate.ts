/**
 * Ascension Level hierarchy — single source of truth.
 *
 * L0 Prospect            — no active hats
 * L1 Fiduciary Officer   — holds any committee hat
 * L2 Oversight Chair     — holds `oversight_chair` hat
 * L3 Protocol Steward    — holds `tophat` (universal override)
 */
export type AscensionLevel = 0 | 1 | 2 | 3;

export const getAscensionLevel = (activeHats: Set<string>): AscensionLevel => {
  if (activeHats.has("tophat")) return 3;
  if (activeHats.has("oversight_chair")) return 2;
  if (activeHats.size > 0) return 1;
  return 0;
};

export const LEVEL_LABEL: Record<AscensionLevel, string> = {
  0: "Prospect",
  1: "Fiduciary Officer (L1)",
  2: "Oversight Chair (L2)",
  3: "Protocol Steward (L3)",
};

export const LEVEL_BADGE_CLASS: Record<AscensionLevel, string> = {
  0: "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-950/30 dark:border-slate-900/50",
  1: "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/50",
  2: "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900/50",
  3: "text-purple-700 bg-purple-50 border-purple-100 dark:text-purple-300 dark:bg-purple-950/30 dark:border-purple-900/50",
};

export const canPerformAction = (
  userLevel: AscensionLevel,
  required: AscensionLevel,
): boolean => userLevel >= required;
