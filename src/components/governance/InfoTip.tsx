import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTipProps {
  label: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  size?: "xs" | "sm";
}

/**
 * Tap-to-reveal (?) tooltip. Controlled Popover so tapping the icon
 * reliably toggles the content, even when nested inside other triggers
 * (e.g. CollapsibleTrigger). Stops propagation so the parent trigger
 * doesn't also fire.
 */
const InfoTip: React.FC<InfoTipProps> = ({
  label,
  children,
  side = "top",
  className,
  size = "xs",
}) => {
  const [open, setOpen] = useState(false);
  const dim = size === "xs" ? "w-4 h-4" : "w-5 h-5";
  const icon = size === "xs" ? 10 : 12;

  const toggle = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((v) => !v);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`What is ${label}?`}
          aria-expanded={open}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              toggle(e);
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
        className="z-[80] max-w-[240px] p-3 rounded-2xl text-[11px] leading-relaxed font-medium bg-popover text-popover-foreground shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
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
