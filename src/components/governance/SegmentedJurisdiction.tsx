import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Zap, Scale, ChevronDown } from "lucide-react";

export type Jurisdiction = "wyoming" | "delaware";

export interface JurisdictionSection {
  id: string;
  label: string;
}

interface Props {
  value: Jurisdiction;
  onChange: (v: Jurisdiction) => void;
  sections?: Record<Jurisdiction, JurisdictionSection[]>;
}

const SegmentedJurisdiction: React.FC<Props> = ({ value, onChange, sections }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const segs: { id: Jurisdiction; label: string; sub: string; icon: React.ElementType }[] = [
    { id: "wyoming", label: "Wyoming DUNA", sub: "Operational Gateway", icon: Zap },
    { id: "delaware", label: "Delaware MSA", sub: "Corporate Registry", icon: Scale },
  ];

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const handleTap = (id: Jurisdiction) => {
    if (value === id) {
      setMenuOpen((o) => !o);
      return;
    }
    console.log(`[JURISDICTION_TOGGLE] START: ${id.toUpperCase()}`);
    setMenuOpen(false);
    onChange(id);
    console.log(`[JURISDICTION_TOGGLE] END: ${id.toUpperCase()}`);
  };

  const jumpTo = (sectionId: string) => {
    setMenuOpen(false);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const items = sections?.[value] ?? [];

  return (
    <div ref={rootRef} className="relative">
      <div className="flex p-1 bg-teal-50/60 dark:bg-teal-950/40 backdrop-blur-md rounded-full border border-teal-100/70 dark:border-teal-900/60 shadow-inner">
        {segs.map((s) => {
          const active = value === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => handleTap(s.id)}
              aria-expanded={active ? menuOpen : undefined}
              aria-haspopup={active ? "menu" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-full transition-all duration-300 outline-none focus:ring-2 focus:ring-teal-500/50",
                active
                  ? "bg-[hsl(178,42%,32%)] text-white shadow-md transform scale-[1.02]"
                  : "text-teal-700/60 dark:text-teal-200/70 hover:text-teal-800 dark:hover:text-teal-100 hover:bg-teal-100/50 dark:hover:bg-teal-900/40",
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                <Icon size={12} className={cn(active ? "text-orange-400" : "opacity-70")} />
                {s.label}
                {active && items.length > 0 && (
                  <ChevronDown size={12} className={cn("transition-transform", menuOpen && "rotate-180")} />
                )}
              </div>
              <div
                className={cn(
                  "text-[8px] font-bold mt-1 tracking-wider uppercase",
                  active ? "text-teal-100/80" : "text-teal-600/50 dark:text-teal-300/50",
                )}
              >
                {s.sub}
              </div>
            </button>
          );
        })}
      </div>

      {menuOpen && items.length > 0 && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-teal-100/70 dark:border-teal-900/60 bg-background/90 backdrop-blur-xl shadow-lg p-2 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <p className="px-3 pt-1 pb-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Jump to section
          </p>
          {items.map((it) => (
            <button
              key={it.id}
              role="menuitem"
              onClick={() => jumpTo(it.id)}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-teal-100/60 dark:hover:bg-teal-900/40"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SegmentedJurisdiction;
