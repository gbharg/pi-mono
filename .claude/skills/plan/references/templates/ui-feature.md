# Template: UI Feature

## Context
Adding [FEATURE] to [PAGE/COMPONENT]. Users need to [USER_GOAL].

## Scope
**In scope:** component implementation, state management, responsive design, a11y
**NOT in scope:** backend changes (API already exists), design system changes

## User Stories

### US-001: Component Structure
**Description:** Create the component hierarchy and basic layout.
**Acceptance Criteria:**
1. Component renders without errors
2. Props interface defined with TypeScript types
3. Follows existing component patterns in codebase
4. Responsive: works on mobile (375px) and desktop (1280px)
5. Typecheck passes

### US-002: State + Interactions
**Description:** Wire up state management and user interactions.
**Acceptance Criteria:**
1. State changes reflect in UI immediately
2. Loading states shown during async operations
3. Error states displayed with actionable message
4. Empty state has warmth + primary action (not just "No items")
5. Typecheck passes

### US-003: Accessibility + Polish
**Description:** Ensure keyboard navigation, screen reader support, and visual polish.
**Acceptance Criteria:**
1. All interactive elements keyboard-accessible (Tab, Enter, Escape)
2. ARIA labels on non-text elements
3. Color contrast meets WCAG AA (4.5:1 text, 3:1 large)
4. Touch targets ≥ 44px
5. Typecheck passes

### US-004: Tests
**Description:** Component tests for rendering, interaction, and edge cases.
**Acceptance Criteria:**
1. Renders with default props
2. Interaction test (click, type, submit)
3. Empty/loading/error state tests
4. Responsive snapshot test (mobile + desktop)
5. All tests pass

## Testing & Validation
- Component tests: render, interact, assert
- Visual: manual check on mobile + desktop
- A11y: keyboard-only navigation test

## Rollback
- Remove component import from parent
- Revert route/page changes
- Feature flag if partial rollback needed
