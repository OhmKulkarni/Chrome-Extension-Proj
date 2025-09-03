# Chart Optimization Controls - User Interface Guide

## 🎯 **Where to Find All Controls**

### **1. Chart Performance Settings**
**Location**: `Dashboard` → `Settings Tab` → `Chart Performance Settings Card`

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Chart Performance Settings                              │
│ Configure dashboard chart refresh behavior...           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Chart Refresh Mode                                      │
│ ○ 🔄 Automatic (periodic refresh)                      │
│ ● 🖱️ Manual (refresh button only)                      │
│                                                         │
│ Performance Optimizations                               │
│ ☑️ Enable shared data processing                       │
│ ☑️ Show data staleness indicators                      │
│                                                         │
│ 💡 Performance Impact                                   │
│ Manual mode: ~90% less CPU usage                       │
│ Shared processing: ~60-80% less calculations           │
└─────────────────────────────────────────────────────────┘
```

### **2. Manual Refresh Button & Indicators**
**Location**: `Dashboard` → `Statistics Dashboard` → `Top Control Bar`

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Extension Statistics Dashboard                       │
│ Comprehensive analytics for network requests...         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [🔄 Refresh Charts] ⚡ Shared Processing Active        │
│                     Last updated: 2:45:30 PM           │
│                                          Records: [200▼]│
└─────────────────────────────────────────────────────────┘
```

## 🎛️ **Control Behavior**

### **Settings Controls** (Always Visible)
- **Chart Refresh Mode**: Radio buttons to choose Auto/Manual
- **Refresh Interval**: Slider (only shows when Auto selected)
- **Optimization Toggles**: Checkboxes for features

### **Dashboard Controls** (Conditional Visibility)
- **Refresh Button**: Only shows when Manual mode is enabled
- **Performance Badge**: Only shows when shared processing is enabled
- **Timestamp**: Only shows when staleness tracking is enabled

## 🔄 **User Workflow**

### **To Enable Manual Refresh:**
1. Go to `Settings` → `Chart Performance Settings`
2. Select `🖱️ Manual (refresh button only)`
3. Click `Save Settings`
4. Return to main dashboard
5. **Refresh button now appears** in top control bar

### **To Use Manual Refresh:**
1. Look for `🔄 Refresh Charts` button in dashboard header
2. Click to refresh all chart data
3. Watch performance indicators update

### **To Enable Optimizations:**
1. Go to `Settings` → `Chart Performance Settings`
2. Check `☑️ Enable shared data processing`
3. Check `☑️ Show data staleness indicators`
4. Click `Save Settings`
5. **Performance badges now appear** in dashboard

## 🎨 **Visual Cues**

### **Button States:**
- **Enabled**: Blue outline, hover effects
- **Disabled**: Gray, not clickable
- **Active**: Shows spinner during refresh

### **Performance Indicators:**
- **Green badge**: "⚡ Shared Processing Active"
- **Gray text**: "Last updated: [time]"
- **Color coding**: Fresh (green) → Aging (yellow) → Stale (red)

## 📱 **Responsive Design**

### **Desktop View:**
- All controls visible horizontally
- Full text labels
- Side-by-side layout

### **Mobile View:**
- Controls stack vertically
- Compact button text
- Responsive indicators

---

**Key Point**: The refresh button only appears when manual mode is selected in settings. This creates a clean, context-aware interface where users see controls relevant to their chosen mode.
