import { Children, type ReactNode, useEffect, useRef } from "react";

interface InfiniteCarouselProps {
  children: ReactNode;
  direction: "left" | "right";
  ariaLabel: string;
}

const AUTO_SCROLL_PX_PER_SECOND = 18;

export function InfiniteCarousel({ children, direction, ariaLabel }: InfiniteCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointerTypeRef = useRef("");
  const pointerStartRef = useRef({ x: 0, scrollLeft: 0 });
  const items = Children.toArray(children);
  const repetitions = Math.max(1, Math.ceil(8 / Math.max(items.length, 1)));
  const repeatedItems = Array.from({ length: repetitions }, (_, repetitionIndex) =>
    items.map((item, itemIndex) => ({ item, key: `${repetitionIndex}-${itemIndex}` })),
  ).flat();

  useEffect(() => {
    const viewport = viewportRef.current;
    const segment = segmentRef.current;
    if (!viewport || !segment || items.length === 0) return;

    const centerOnMiddleCopy = () => {
      const width = segment.offsetWidth;
      if (width > 0) viewport.scrollLeft = width;
    };

    centerOnMiddleCopy();
    const observer = new ResizeObserver(centerOnMiddleCopy);
    observer.observe(segment);
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const segment = segmentRef.current;
    if (!viewport || !segment || items.length === 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = performance.now();

    const animate = (time: number) => {
      const segmentWidth = segment.offsetWidth;
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;

      if (!pausedRef.current && !reducedMotion.matches && segmentWidth > 0) {
        const distance = (AUTO_SCROLL_PX_PER_SECOND * elapsed) / 1000;
        viewport.scrollLeft += direction === "left" ? distance : -distance;
      }

      if (segmentWidth > 0) {
        if (viewport.scrollLeft < segmentWidth * 0.5) viewport.scrollLeft += segmentWidth;
        if (viewport.scrollLeft > segmentWidth * 1.5) viewport.scrollLeft -= segmentWidth;
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [direction, items.length]);

  const setPaused = (paused: boolean) => {
    pausedRef.current = paused;
  };

  return (
    <div
      ref={viewportRef}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className="no-scrollbar w-full overflow-x-auto overscroll-x-contain py-1 touch-pan-x cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        draggingRef.current = true;
        suppressClickRef.current = false;
        pointerTypeRef.current = event.pointerType;
        pointerStartRef.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
        setPaused(true);
        if (event.pointerType === "mouse") event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;
        const distance = event.clientX - pointerStartRef.current.x;
        if (Math.abs(distance) > 6) suppressClickRef.current = true;
        if (pointerTypeRef.current === "mouse") {
          event.currentTarget.scrollLeft = pointerStartRef.current.scrollLeft - distance;
        }
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!event.currentTarget.contains(document.activeElement)) {
          setPaused(false);
        }
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
        setPaused(false);
      }}
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }
      }}
    >
      <div className="flex w-max">
        {[0, 1, 2].map((copyIndex) => (
          <div
            key={copyIndex}
            ref={copyIndex === 0 ? segmentRef : undefined}
            aria-hidden={copyIndex === 1 ? undefined : true}
            className="flex shrink-0 items-start gap-6 pr-6"
          >
            {repeatedItems.map(({ item, key }) => (
              <div key={key} className="w-24 shrink-0">
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}