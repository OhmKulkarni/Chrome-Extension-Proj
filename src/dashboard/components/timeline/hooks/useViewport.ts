import { useState, useCallback, useMemo, useRef } from 'react'
import { ViewportRange, TIME_SCOPES } from '../types/timeline.types'

interface UseViewportProps {
  initialScope?: string
  initialCenterTime?: number
}

export const _useViewport = ({
  initialScope = '1-hour',
  initialCenterTime
}: UseViewportProps = {}) => {
  const [currentScope, setCurrentScope] = useState<string>(initialScope)
  const [centerTime, setCenterTime] = useState<number>(
    initialCenterTime || Date.now()
  )
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [earliestDataTimestamp, setEarliestDataTimestamp] = useState<number>(
    Date.now() - (24 * 60 * 60 * 1000) // Default fallback
  )
  const [latestDataTimestamp, setLatestDataTimestamp] = useState<number>(
    Date.now() // Default fallback to current time
  )
  const animationRef = useRef<number | null>(null)

  const _scopeConfig = useMemo(() => {
    return TIME_SCOPES.find(scope => scope.key === currentScope) || TIME_SCOPES[5] // Default to 1-hour
  }, [currentScope])

  const _viewport = useMemo<ViewportRange>(() => {
    const _halfDuration = scopeConfig.duration / 2
    return {
      startTime: centerTime - halfDuration,
      endTime: centerTime + halfDuration,
      duration: scopeConfig.duration
    }
  }, [centerTime, scopeConfig.duration])

  // Smooth animation function
  const _animateCenterTime = useCallback((targetTime: number, duration = 800) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const _startTime = centerTime
    const _startTimestamp = performance.now()
    setIsAnimating(true)

    const _animate = (currentTimestamp: number) => {
      const _elapsed = currentTimestamp - startTimestamp
      const _progress = Math.min(elapsed / duration, 1)

      // Smooth easing function (ease-out)
      const _easeOut = 1 - Math.pow(1 - progress, 3)

      const _currentTime = startTime + (targetTime - startTime) * easeOut
      setCenterTime(currentTime)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        animationRef.current = null
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [centerTime])

  const _zoomIn = useCallback(() => {
    const _currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    if (currentIndex > 0) {
      const _nextScope = TIME_SCOPES[currentIndex - 1]  // Go to shorter duration (more detailed)
      setCurrentScope(nextScope.key)
    }
  }, [currentScope])

  const _zoomOut = useCallback(() => {
    const _currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    if (currentIndex < TIME_SCOPES.length - 1) {
      const _prevScope = TIME_SCOPES[currentIndex + 1]  // Go to longer duration (less detailed)
      setCurrentScope(prevScope.key)
    }
  }, [currentScope])

  const _panLeft = useCallback(() => {
    if (isAnimating) return
    // Move left by 30% of current viewport
    const _panAmount = scopeConfig.duration * 0.3
    const _targetTime = centerTime - panAmount
    animateCenterTime(targetTime)
  }, [centerTime, scopeConfig.duration, animateCenterTime, isAnimating])

  const _panRight = useCallback(() => {
    if (isAnimating) return
    // Move right by 30% of current viewport
    const _panAmount = scopeConfig.duration * 0.3
    const _targetTime = centerTime + panAmount
    animateCenterTime(targetTime)
  }, [centerTime, scopeConfig.duration, animateCenterTime, isAnimating])

  const _jumpToPreset = useCallback((presetScope: string) => {
    // Handle the new timeline header format (e.g., 'last-1-hour', 'first-30-minutes')
    let _targetScope = presetScope
    let _targetTime = Date.now()

    if (presetScope.startsWith('last-') || presetScope.startsWith('first-')) {
      // Extract the actual scope from 'last-1-hour' or 'first-30-minutes'
      const _scopePart = presetScope.replace(/^(last-|first-)/, '')
      targetScope = scopePart

      if (presetScope.startsWith('last-')) {
        // For 'last-' scopes, jump to the latest data time (most recent record)
        const _now = Date.now()
        const _timeDiff = now - latestDataTimestamp

        // Check if latestDataTimestamp looks like default fallback (current time)
        const _isCurrentTimeFallback = Math.abs(timeDiff) < (5 * 60 * 1000) // Within 5 minutes of current time

        if (isCurrentTimeFallback) {
          // This might be the default fallback - use current time but log for debugging
          // console.log('🕐 Using current time for last- scope (no data loaded yet)')
          targetTime = now
        } else {
          // We have actual data - use the real latest timestamp
          // console.log(`🕐 Using latest record time: ${new Date(latestDataTimestamp).toISOString()}`)
          targetTime = latestDataTimestamp
        }
      } else if (presetScope.startsWith('first-')) {
        // For 'first-' scopes, jump to the earliest data time
        const _now = Date.now()
        const _timeDiff = now - earliestDataTimestamp

        // Check if this looks like the default fallback (exactly 24 hours ago)
        const _isExactlyOneDayFallback = Math.abs(timeDiff - (24 * 60 * 60 * 1000)) < (60 * 1000) // Within 1 minute of exactly 24 hours

        if (isExactlyOneDayFallback) {
          // This is likely the default fallback - use a more reasonable estimate
          // Based on typical usage patterns, go back 5 days to capture recent browsing history
          targetTime = now - (5 * 24 * 60 * 60 * 1000)
        } else {
          // We have actual data - use the real earliest timestamp
          targetTime = earliestDataTimestamp
        }
      }
    } else if (presetScope === 'all-time') {
      targetScope = 'all-time'
      // For all-time, center on a reasonable time point
      targetTime = Date.now() - (30 * 24 * 60 * 60 * 1000) // Go back 30 days
    }

    setCurrentScope(targetScope)
    animateCenterTime(targetTime, 1000) // Longer animation for bigger jumps
  }, [earliestDataTimestamp, latestDataTimestamp, animateCenterTime])

  const _jumpToTime = useCallback((timestamp: number, scope?: string) => {
    // Cancel any ongoing animations first to prevent conflicts
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
      setIsAnimating(false)
    }

    // Change scope first if needed
    if (scope && scope !== currentScope) {
      setCurrentScope(scope)
    }

    // Then animate to the target time with a slight delay to ensure scope change takes effect
    if (scope && scope !== currentScope) {
      // Small delay to ensure scope change is processed
      setTimeout(() => {
        animateCenterTime(timestamp, 600) // Shorter animation for better UX
      }, 50)
    } else {
      animateCenterTime(timestamp, 600)
    }
  }, [currentScope, animateCenterTime])

  const _canZoomIn = useMemo(() => {
    const _currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    return currentIndex > 0  // Can zoom in if not at most detailed level (index 0)
  }, [currentScope])

  const _canZoomOut = useMemo(() => {
    const _currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    return currentIndex < TIME_SCOPES.length - 1  // Can zoom out if not at least detailed level (last index)
  }, [currentScope])

  return {
    viewport,
    currentScope,
    scopeConfig,
    centerTime,
    zoomLevel: scopeConfig.zoomLevel,
    isAnimating,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
    jumpToPreset,
    jumpToTime,
    setCenterTime,
    setEarliestDataTimestamp,
    setLatestDataTimestamp
  }
}
