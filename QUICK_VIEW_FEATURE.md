# Quick View Feature Documentation

## Overview

The Quick View feature provides a Netflix/Tinder-style "peek" interaction that allows users to see brief movie details during swiping without leaving the swipe flow. It uses a long-press gesture that doesn't interfere with swipe gestures.

## User Interactions

### Primary Gesture: Long Press
- **Press & hold** for ~450ms → Opens Quick View modal
- **Release** → Closes modal
- **Swipe movement** before hold duration → Cancels Quick View, enables swipe

### Alternative Access
- **Info button (i)** in top-left corner → Opens Quick View (accessibility fallback)
- **Keyboard**: Focus card + `Enter` or `Space` → Opens Quick View

### Gesture Priority
1. **Movement detected** (>10px) → Swipe takes priority, long press cancelled
2. **Hold without movement** (450ms) → Quick View opens
3. **Quick tap** → No action (avoids conflicts)
4. **Double tap** → Like action (existing feature)

## Modal Content

The Quick View modal displays:
- Movie poster (small, 24-28px width)
- Title + release year
- Rating (star vote average /10)
- Runtime (if available)
- Genre tags (up to 3)
- Overview (truncated to 2 sentences)
- Close hint text

**Excluded** (as per requirements):
- Trailers
- Cast list
- Navigation away from swipe flow

## Technical Implementation

### Components

#### QuickViewModal.tsx
```typescript
- Framer Motion animations (slide up from bottom on mobile, centered on desktop)
- Portal-based rendering with backdrop blur
- Escape key to close
- Click outside to close
- Body scroll lock when open
- Respects prefers-reduced-motion
```

#### SwipeableMovieCard.tsx (Enhanced)
```typescript
- Long press detection using Pointer Events API
- Movement threshold: 10px (cancels long press if exceeded)
- Long press delay: 450ms
- Gesture conflict resolution
- Disables dragging when modal is open
- Keyboard navigation support
```

### Gesture Detection Logic

```typescript
1. onPointerDown → Start timer (450ms)
2. onPointerMove → Check movement
   - If movement > 10px → Cancel timer, enable swipe
   - If movement < 10px → Continue timer
3. Timer completes → Open Quick View
4. onPointerUp → Close modal (if open) or process swipe
```

### State Management

```typescript
const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
const [isDragging, setIsDragging] = useState(false);
const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
```

## Accessibility Features

### Keyboard Support
- Card is focusable (`tabIndex={0}`)
- `Enter` or `Space` opens Quick View
- `Escape` closes modal
- Focus trap within modal (handled by Framer Motion)

### Screen Reader Support
- Proper ARIA labels on card: `"${movie.title}. Press and hold for quick view..."`
- Modal has `role="dialog"` and `aria-modal="true"`
- Title has `id="quick-view-title"` for `aria-labelledby`

### Visual Fallback
- Info button (i) always visible in top-left corner
- Works for users who can't perform long press
- Hover state for discoverability

## Platform Behavior

### Mobile
- Bottom sheet style
- Slide up animation
- Drag indicator at top
- Swipe down to dismiss hint
- Full-width with rounded top corners

### Desktop
- Centered modal
- Standard fade + scale animation
- Click outside to close
- Max width: 28rem (448px)

## Performance Considerations

- No additional API calls (uses existing movie data)
- Lightweight modal (minimal DOM)
- Cleanup timers on unmount
- Prevents body scroll only when modal open
- Respects `prefers-reduced-motion`

## Testing Checklist

### Gesture Conflicts
- Long press → Opens modal
- Swipe left → Discards (doesn't open modal)
- Swipe right → Maybe (doesn't open modal)
- Double tap → Likes (doesn't open modal)
- Quick tap → No action
- Modal open → Swipe disabled

### Accessibility
- Keyboard navigation works
- Screen reader announces modal
- Info button visible and clickable
- Focus management correct

### Cross-Platform
- Works on iOS Safari
- Works on Android Chrome
- Works on desktop browsers
- Touch and mouse events handled

## User Experience

The feature should feel:
- **Intentional**: 450ms delay prevents accidental triggers
- **Fast**: Modal appears instantly after hold duration
- **Unobtrusive**: Doesn't interrupt swipe flow
- **Confident**: Users can peek at details before deciding
- **Accessible**: Multiple ways to access information

## Future Enhancements

### Phase 2 (Optional)
- Haptic feedback on long press start (mobile)
- Progress indicator during hold (visual feedback)
- Swipe down gesture to close (currently release only)
- Customizable hold duration in settings
- Analytics tracking for Quick View usage

## Code Files Modified

1. **`/components/QuickViewModal.tsx`** (NEW)
   - Modal component with animations
   - Responsive design (mobile/desktop)
   - Accessibility features

2. **`/components/SwipeableMovieCard.tsx`** (ENHANCED)
   - Long press gesture detection
   - Conflict resolution with swipe
   - Info button fallback
   - Keyboard support

## Dependencies

- `framer-motion` - Already in project (for animations)
- No new dependencies required

## Browser Support

- Modern browsers with Pointer Events API
- Fallback: Info button works in all browsers
- Tested on:
  - Chrome 90+
  - Safari 14+
  - Firefox 88+
  - Edge 90+
