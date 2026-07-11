import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTipProps {
  label: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  /** Slightly larger circular hit target */
  size?: "xs" | "sm";
}

/**
 * Tap-to-reveal (?) tooltip. Uses a <span role="button"> so it can safely sit
 * inside <button>/<CollapsibleTrigger> without violating nested-button HTML.
 * Stops propagation so tapping the (?) never fires the parent trigger.
 */
const InfoTip: React.FC<InfoTipProps> = ({
  label,
  children,
  side = "top",
  className,
  size = "xs",
}) => {
  const dim = size === "xs" ? "w-4 h-4" : "w-5 h-5";
  const icon = size === "xs" ? 10 : 12;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`What is ${label}?`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-muted-foreground/30 bg-background/80 text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 hover:bg-muted transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
            dim,
            className,
          )}
        >
          <HelpCircle size={icon} strokeWidth={2.5} />
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="center"
        sideOffset={6}
        className="max-w-[240px] p-3 rounded-2xl text-[11px] leading-relaxed font-medium bg-popover text-popover-foreground shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300 mb-1">
          {label}
        </p>
        <div className="text-foreground/85">{children}</div>
      </PopoverContent>
    </Popover>
  );
};

export default InfoTip;
