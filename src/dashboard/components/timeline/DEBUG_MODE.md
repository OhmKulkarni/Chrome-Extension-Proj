# Timeline Debug Mode Guide

## Activation

Press `Ctrl + Shift + D` to toggle debug mode on/off.

## Features

### Visual Indicators
- **Purple Grid Lines**: Show percentage positions (0%, 10%, 20%, etc.)
- **Fade Zones**: Purple gradient at 5% edges showing fade areas
- **Red Dots**: Actual event positions with hover tooltips

### Debug Panel (Top Right)
Shows real-time information for each swimlane:
- **Total Events**: All events in the swimlane
- **Visible**: Events currently in viewport (including buffer)
- **Fading**: Events in fade zones
- **Layers Used**: Number of vertical layers for overlapping events

### Same Timestamp Groups
Lists events that share the exact same timestamp, helping identify vertical stacking scenarios.

### Layer Distribution
Shows how many events are in each vertical layer.

### Viewport Info
- Start/End times
- Duration in minutes

## Use Cases

1. **Troubleshooting Position Issues**
   - Verify events stay at correct timestamps when panning
   - Check fade transitions at viewport edges

2. **Performance Analysis**
   - Monitor visible vs total events
   - Check layer efficiency

3. **Data Validation**
   - Identify same-timestamp event clusters
   - Verify event distribution

## Performance Note
Debug mode adds overhead. Disable for production use.
