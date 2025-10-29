# Bug Report: Tab Navigation Disappears on Kanban and Calendar Views

**Date**: 2025-10-29
**Severity**: High
**Priority**: Critical
**Status**: Under Investigation
**Reporter**: User
**Affected Components**: StaffTabs, KanbanBoard, CalendarView

---

## Summary

When staff users switch to the Kanban (კანბანი) or Calendar (კალენდარი) tabs in the staff tabbed interface, the entire tab navigation bar disappears, preventing users from navigating back to other tabs (Messages, About Project, Tasks, Files).

## User Impact

- **Severity**: Users become trapped in Kanban or Calendar views with no way to return to other tabs
- **Workaround**: Requires page refresh or navigating away from the chat entirely
- **User Experience**: Critical navigation failure that breaks core staff functionality

## Steps to Reproduce

1. Log in as a staff user (admin or team_member role)
2. Open any chat
3. Toggle to Staff Mode (amber toggle in header)
4. Click on the "კანბანი" (Kanban) tab OR "კალენდარი" (Calendar) tab
5. **Expected**: Tab navigation bar remains visible, user can click other tabs
6. **Actual**: Tab navigation bar disappears completely

## Environment

- **Application**: DualChat Team Communication Platform
- **Affected Views**: Kanban Board, Calendar View
- **Unaffected Views**: Messages, About Project, Tasks, Files
- **Browser**: All browsers (issue is CSS/layout-related)
- **Viewport**: Both desktop and mobile (likely)

## Technical Analysis

### Architecture Context

The staff interface uses a tabbed layout implemented in `/home/bekolozi/Desktop/duality-comms/src/components/chat/StaffTabs.tsx`:

```tsx
<Tabs defaultValue="messages" className="flex-1 min-h-0 flex flex-col overflow-x-hidden">
  <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar md:overflow-x-visible">
    <TabsList className="min-w-max inline-flex w-auto justify-start...">
      {/* Tab triggers for: messages, about, tasks, kanban, calendar, files */}
    </TabsList>
  </div>

  <TabsContent value="kanban" className="flex-1 flex flex-col m-0 p-0 bg-white data-[state=inactive]:hidden">
    {children.kanban}
  </TabsContent>

  <TabsContent value="calendar" className="flex-1 flex flex-col m-0 p-0 bg-white data-[state=inactive]:hidden">
    {children.calendar}
  </TabsContent>
</Tabs>
```

### Root Cause Hypothesis

Both `KanbanBoard.tsx` and `CalendarView.tsx` wrap their entire content in `<ScrollArea>` components with `flex-1` class:

**KanbanBoard.tsx (line 287-341):**
```tsx
<div className="flex-1 flex flex-col">
  <div className="border-b bg-card p-4">
    {/* Header */}
  </div>

  <ScrollArea className="flex-1">  {/* POTENTIAL ISSUE */}
    <div className="p-4 overflow-x-auto w-full">
      {/* Kanban content */}
    </div>
  </ScrollArea>
</div>
```

**CalendarView.tsx (line 188-283):**
```tsx
<div className="flex-1 flex flex-col">
  <div className="border-b bg-card p-4">
    {/* Header */}
  </div>

  <ScrollArea className="flex-1">  {/* POTENTIAL ISSUE */}
    <div className="p-4">
      {/* Calendar content */}
    </div>
  </ScrollArea>
</div>
```

### Suspected Issues

1. **Overflow Hiding**: The `ScrollArea` component may be applying `overflow: hidden` or `position: absolute/fixed` that hides parent tab navigation
2. **Z-index Stacking**: Content may be rendering on top of the tab navigation with improper z-index
3. **Height Calculation**: `flex-1` combined with `ScrollArea` may cause height calculations that push tabs out of viewport
4. **Flexbox Conflicts**: Nested flex containers with `min-h-0` and `flex-1` may be causing layout collapse

### Component Comparison

**Working Tabs** (Messages, Tasks, Files):
- Do NOT use `ScrollArea` wrapper at root level
- Use simpler flex layouts or direct scroll handling
- Tab navigation remains visible

**Broken Tabs** (Kanban, Calendar):
- Both use `ScrollArea` wrapper with `flex-1` class
- Both have identical structure: outer flex container → header → ScrollArea → content
- Tab navigation disappears

## Affected Files

### Primary Components
- `/home/bekolozi/Desktop/duality-comms/src/components/chat/StaffTabs.tsx` (lines 16-91)
- `/home/bekolozi/Desktop/duality-comms/src/components/chat/tabs/KanbanBoard.tsx` (lines 266-365)
- `/home/bekolozi/Desktop/duality-comms/src/components/chat/tabs/CalendarView.tsx` (lines 188-305)

### Supporting Components
- `/home/bekolozi/Desktop/duality-comms/src/components/ui/scroll-area.tsx` (shadcn-ui component)
- `/home/bekolozi/Desktop/duality-comms/src/components/chat/ChatWindow.tsx` (lines 229-244, parent component)

### Styling
- `/home/bekolozi/Desktop/duality-comms/src/index.css` (lines 156-162 for `.no-scrollbar`, lines 176-244 for calendar styles)

## Investigation Tasks

### 1. Verify ScrollArea Component Behavior
**Priority**: Critical
**Assignee**: TBD

- [ ] Inspect the shadcn-ui `ScrollArea` component implementation
- [ ] Check if it applies `overflow: hidden`, `position: absolute`, or other layout-breaking styles
- [ ] Test with browser DevTools to identify which CSS property is hiding tabs
- [ ] Document the exact CSS properties causing the issue

**Acceptance Criteria**:
- Root cause identified with specific CSS property or component behavior
- Screenshot/recording of browser DevTools showing the issue

### 2. Review Working Tab Implementations
**Priority**: High
**Assignee**: TBD

- [ ] Examine `MessagesTab.tsx` layout structure
- [ ] Examine `TasksTab.tsx` layout structure
- [ ] Examine `FilesTab.tsx` layout structure
- [ ] Examine `AboutProjectTab.tsx` layout structure
- [ ] Document how these tabs handle scrolling without hiding navigation

**Acceptance Criteria**:
- Documentation of layout patterns used in working tabs
- Comparison table showing structural differences

### 3. Implement Fix for KanbanBoard
**Priority**: Critical
**Assignee**: TBD

**Options to Explore**:

**Option A**: Remove `ScrollArea` wrapper, use native overflow
```tsx
<div className="flex-1 flex flex-col overflow-hidden">
  <div className="border-b bg-card p-4">{/* Header */}</div>
  <div className="flex-1 overflow-auto p-4">
    {/* Kanban content */}
  </div>
</div>
```

**Option B**: Adjust ScrollArea classes
```tsx
<div className="flex-1 flex flex-col">
  <div className="border-b bg-card p-4">{/* Header */}</div>
  <ScrollArea className="flex-1 min-h-0">
    {/* Kanban content */}
  </ScrollArea>
</div>
```

**Option C**: Restructure parent TabsContent
```tsx
<TabsContent value="kanban" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
  {children.kanban}
</TabsContent>
```

**Tasks**:
- [ ] Test each option in development environment
- [ ] Verify tab navigation remains visible
- [ ] Verify kanban drag-and-drop still works
- [ ] Verify scrolling behavior works correctly
- [ ] Test on different viewport sizes (mobile, tablet, desktop)

**Acceptance Criteria**:
- Tab navigation visible when on Kanban tab
- All kanban columns scrollable horizontally
- Kanban board scrollable vertically
- Drag-and-drop functionality preserved
- No visual regressions

### 4. Implement Fix for CalendarView
**Priority**: Critical
**Assignee**: TBD

**Same Options as KanbanBoard** (see above)

**Tasks**:
- [ ] Apply same fix pattern as KanbanBoard
- [ ] Verify tab navigation remains visible
- [ ] Verify calendar (react-big-calendar) renders correctly
- [ ] Verify calendar scrolling works (especially for month view with 6 weeks)
- [ ] Test calendar interaction (clicking events, changing views)
- [ ] Test on different viewport sizes

**Acceptance Criteria**:
- Tab navigation visible when on Calendar tab
- Calendar renders fully (toolbar, month grid, events)
- Calendar scrollable when content exceeds viewport
- All calendar interactions work (event clicks, view switching)
- No visual regressions

### 5. Cross-browser and Responsive Testing
**Priority**: High
**Assignee**: TBD

- [ ] Test on Chrome/Edge (Chromium)
- [ ] Test on Firefox
- [ ] Test on Safari (if available)
- [ ] Test on mobile viewport (< 768px)
- [ ] Test on tablet viewport (768px - 1024px)
- [ ] Test on desktop viewport (> 1024px)
- [ ] Verify horizontal scrolling on mobile for kanban columns
- [ ] Verify tab list horizontal scroll on mobile (`.no-scrollbar` class)

**Acceptance Criteria**:
- Tab navigation visible across all browsers
- Tab navigation visible across all viewport sizes
- No layout breaks or overflow issues
- Smooth scrolling behavior

### 6. Regression Testing
**Priority**: Medium
**Assignee**: TBD

- [ ] Verify all other tabs still work (Messages, About, Tasks, Files)
- [ ] Verify staff mode toggle still works
- [ ] Verify client mode view still works
- [ ] Verify chat switching still works
- [ ] Verify real-time message updates still work
- [ ] Verify file uploads still work in Messages tab
- [ ] Verify task creation/editing still works

**Acceptance Criteria**:
- All existing functionality preserved
- No new bugs introduced

## Solution Recommendations

### Recommended Approach: Option A (Remove ScrollArea)

Based on the analysis, I recommend **Option A** for both components:

**Rationale**:
1. **Simplicity**: Native browser scrolling is more predictable than custom scroll components
2. **Consistency**: Working tabs (Messages, Tasks) don't use ScrollArea wrappers
3. **Performance**: One less component in the render tree
4. **Maintainability**: Standard CSS overflow is easier to debug and maintain
5. **Compatibility**: Native scrolling works identically across all browsers

**Implementation Pattern**:
```tsx
<div className="flex-1 flex flex-col overflow-hidden">
  {/* Header - fixed at top */}
  <div className="border-b bg-card p-4 flex-shrink-0">
    {/* Header content */}
  </div>

  {/* Scrollable content area */}
  <div className="flex-1 overflow-auto">
    <div className="p-4">
      {/* Page content (kanban/calendar) */}
    </div>
  </div>
</div>
```

**CSS Classes Breakdown**:
- `flex-1`: Takes remaining height in parent flex container
- `flex flex-col`: Vertical flex layout for header + content
- `overflow-hidden`: Prevents content from escaping container
- Inner `flex-1 overflow-auto`: Enables scrolling when content exceeds height
- `flex-shrink-0` on header: Prevents header from shrinking

## Timeline Estimate

- **Investigation**: 2-4 hours
- **Fix Implementation**: 3-5 hours
- **Testing**: 4-6 hours
- **Total**: 9-15 hours (~1-2 days)

## Risk Assessment

**Risk**: Low-Medium
**Impact if Unfixed**: High (Critical user-facing bug)

**Risks**:
- Changing layout structure may affect other responsive behaviors
- Calendar library (react-big-calendar) may have specific layout requirements
- Kanban drag-and-drop (@dnd-kit) may be sensitive to scroll container changes

**Mitigation**:
- Test thoroughly on all viewports
- Verify library-specific features (drag-drop, calendar interactions)
- Keep changes minimal and focused
- Have rollback plan if issues arise

## Dependencies

### Libraries
- `@radix-ui/react-scroll-area` (shadcn-ui ScrollArea component)
- `react-big-calendar` (Calendar view)
- `@dnd-kit/core` (Kanban drag-and-drop)
- `@radix-ui/react-tabs` (shadcn-ui Tabs component)

### Related Components
- `src/components/ui/tabs.tsx` (shadcn-ui tabs implementation)
- `src/components/ui/scroll-area.tsx` (shadcn-ui scroll area implementation)

## Success Criteria

Fix is considered successful when:

1. ✅ Tab navigation bar remains visible when switching to Kanban tab
2. ✅ Tab navigation bar remains visible when switching to Calendar tab
3. ✅ All tabs are clickable and switch views correctly
4. ✅ Kanban board scrolls properly (horizontal for columns, vertical for page)
5. ✅ Calendar scrolls properly (vertical when month has many weeks)
6. ✅ Kanban drag-and-drop functionality works
7. ✅ Calendar event clicking and view switching works
8. ✅ No layout issues on mobile, tablet, or desktop viewports
9. ✅ No regressions in other tabs or features
10. ✅ Cross-browser compatibility maintained

## Notes

- UI is in Georgian language (საქართული), but code comments and documentation are in English
- Staff mode uses amber color scheme (`--staff` CSS variables)
- Tab navigation uses horizontal scroll on mobile with `.no-scrollbar` class
- This is a critical bug as it breaks core navigation for staff users
- Issue likely introduced when KanbanBoard and CalendarView were first implemented with ScrollArea wrappers

## References

- StaffTabs Component: `/home/bekolozi/Desktop/duality-comms/src/components/chat/StaffTabs.tsx`
- Kanban Component: `/home/bekolozi/Desktop/duality-comms/src/components/chat/tabs/KanbanBoard.tsx`
- Calendar Component: `/home/bekolozi/Desktop/duality-comms/src/components/chat/tabs/CalendarView.tsx`
- Parent Component: `/home/bekolozi/Desktop/duality-comms/src/components/chat/ChatWindow.tsx`
- Project Documentation: `/home/bekolozi/Desktop/duality-comms/CLAUDE.md`

---

**Last Updated**: 2025-10-29
**Document Version**: 1.0
