# Template: Design Change

## Context
Updating the design of [TARGET: page/component/system]. Current design has [PROBLEM: inconsistency/poor UX/accessibility gap/outdated]. Goal: [DESIRED_OUTCOME].

## Scope
**In scope:** visual design changes, responsive adjustments, a11y improvements
**NOT in scope:** backend logic changes, new features, data model changes

## User Stories

### US-001: Design Audit + Spec
**Description:** Audit the current state, document gaps, and spec the target design.
**Acceptance Criteria:**
1. Current state documented (screenshots, measurements, issues)
2. Target design specified (spacing, colors, typography, layout)
3. DESIGN.md updated (or created) with design tokens
4. Responsive specs per viewport (mobile 375px, tablet 768px, desktop 1280px)
5. Interaction states defined (hover, focus, active, disabled)

### US-002: Component Updates
**Description:** Apply design changes to existing components.
**Acceptance Criteria:**
1. Spacing follows design system scale (4px/8px/16px/etc.)
2. Typography matches DESIGN.md hierarchy
3. Colors use design tokens (not hardcoded hex)
4. No visual regressions in untouched components
5. Typecheck passes

### US-003: Responsive + Accessibility
**Description:** Ensure design works across viewports and is accessible.
**Acceptance Criteria:**
1. Mobile layout intentional (not just "stacked")
2. Touch targets ≥ 44px on mobile
3. Color contrast ≥ 4.5:1 (WCAG AA)
4. Keyboard navigation works (Tab order, focus visible)
5. Screen reader labels on all interactive elements
6. Typecheck passes

### US-004: Visual QA + Polish
**Description:** Side-by-side comparison of before/after, fix remaining issues.
**Acceptance Criteria:**
1. Before/after screenshots for each affected page
2. No AI slop (generic patterns, placeholder content)
3. Empty states have warmth + primary action
4. Loading skeletons match content layout
5. All tests pass

## Testing & Validation
- Visual: before/after screenshots at 3 viewports
- A11y: keyboard-only navigation + screen reader test
- Regression: existing component tests still pass
- Browser: tested in Chrome + Safari (minimum)

## Rollback
- Revert CSS/style changes (one commit preferred)
- No data migration involved
- Design tokens revert with code
