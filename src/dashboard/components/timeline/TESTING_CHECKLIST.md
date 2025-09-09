# Timeline Position Fix Testing Checklist

## Core Positioning Tests

### ✅ Basic Positioning
- [ ] Events appear at correct timestamps
- [ ] Events maintain position when panning left/right
- [ ] No jumping or teleporting of events
- [ ] Time markers align with events

### ✅ Fade Effects
- [ ] Events fade in smoothly from left edge (5% zone)
- [ ] Events fade out smoothly at right edge (5% zone)
- [ ] Opacity transitions are smooth (300ms)
- [ ] Events fully disappear outside viewport buffer

### ✅ Same Timestamp Events
- [ ] Multiple events with identical timestamps stack vertically
- [ ] Stacking order is consistent (by event ID)
- [ ] Layers don't flicker when panning
- [ ] Each same-timestamp event gets its own layer

### ✅ Debug Mode
- [ ] Ctrl+Shift+D toggles debug overlay
- [ ] Grid lines show at correct percentages
- [ ] Red dots match actual event positions
- [ ] Debug panel updates in real-time
- [ ] Hover tooltips show correct information

## Performance Tests

### ✅ Load Testing
- [ ] 100+ events render smoothly
- [ ] Panning remains fluid with many events
- [ ] Memory usage stays stable
- [ ] No lag with multiple same-timestamp groups

### ✅ Zoom Level Tests
Test at each zoom level:
- [ ] 1-minute view
- [ ] 5-minute view
- [ ] 30-minute view
- [ ] 1-hour view
- [ ] 6-hour view
- [ ] 24-hour view
- [ ] All-time view

## Edge Cases

### ✅ Boundary Conditions
- [ ] First event in dataset positions correctly
- [ ] Last event in dataset positions correctly
- [ ] Events at exact viewport boundaries
- [ ] Empty swimlanes handle gracefully

### ✅ Rapid Navigation
- [ ] Fast panning doesn't break positioning
- [ ] Quick zoom in/out maintains alignment
- [ ] Jump to time preserves event positions

## Integration Tests

### ✅ Feature Compatibility
- [ ] Bookmarking works with new positioning
- [ ] Compare mode unaffected
- [ ] Event popups open at correct positions
- [ ] Clustering still works when zoomed out
- [ ] AllTimeViewDemo shows correct metrics
