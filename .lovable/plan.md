## Plan: Collapsible Immutable Audit Trail

### Goal
Make the AuditFeed ("Immutable Audit Trail") section collapsible so its timeline is hidden by default and can be expanded on demand.

### Approach
Wrap the existing `AuditFeed` content in the shadcn `Collapsible` primitive, which is already available in the project. Keep the data polling unchanged so ACA records continue to hydrate in the background. Only the presentation layer changes.

### Changes

1. **`src/components/governance/AuditFeed.tsx`**
   - Import `Collapsible`, `CollapsibleTrigger`, and `CollapsibleContent` from `@/components/ui/collapsible`.
   - Import a chevron icon (e.g., `ChevronDown` from `lucide-react`) to indicate expand/collapse state.
   - Wrap the entire section with `<Collapsible defaultOpen={false}>`.
   - Convert the existing header row into the `CollapsibleTrigger` so clicking the title or chevron toggles the section.
   - Move the loading spinner, empty state, and timeline rows inside `CollapsibleContent`.
   - Apply a small rotating chevron style (e.g., `data-[state=open]:rotate-180`) consistent with Radix `Collapsible` data attributes and existing Tailwind patterns.
   - Preserve the existing `Info` tooltip and section title styling.

### What stays the same
- ACA polling interval and Supabase fetch logic.
- Ledger row rendering, empty state, and styling.
- No backend or schema changes.

### Acceptance criteria
- The Audit Trail section renders with a collapsed timeline on load.
- Clicking the header expands to show the full feed and rotates the chevron.
- Clicking the header again collapses it.