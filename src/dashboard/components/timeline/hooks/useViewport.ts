import { useState, useCallback, useMemo, useRef } from 'react'
import { ViewportRange, TIME_SCOPES } from '../types/timeline.types'

interface UseViewportProps {
  initialScope?: string
  initialCenterTime?: number
}

export const useViewport = ({
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
  const animationRef = useRef<number | null>(null)

  const scopeConfig = useMemo(() => {
    return TIME_SCOPES.find(scope => scope.key === currentScope) || TIME_SCOPES[5] // Default to 1-hour
  }, [currentScope])

  const viewport = useMemo<ViewportRange>(() => {
    const halfDuration = scopeConfig.duration / 2
    return {
      startTime: centerTime - halfDuration,
      endTime: centerTime + halfDuration,
      duration: scopeConfig.duration
    }
  }, [centerTime, scopeConfig.duration])

  // Smooth animation function
  const animateCenterTime = useCallback((targetTime: number, duration = 300) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const startTime = centerTime
    const startTimestamp = performance.now()
    setIsAnimating(true)

    const animate = (currentTimestamp: number) => {
      const elapsed = currentTimestamp - startTimestamp
      const progress = Math.min(elapsed / duration, 1)

      // Smooth easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      const currentTime = startTime + (targetTime - startTime) * easeOut
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

  const zoomIn = useCallback(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    if (currentIndex > 0) {
      const nextScope = TIME_SCOPES[currentIndex - 1]  // Go to shorter duration (more detailed)
      setCurrentScope(nextScope.key)
    }
  }, [currentScope])

  const zoomOut = useCallback(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    if (currentIndex < TIME_SCOPES.length - 1) {
      const prevScope = TIME_SCOPES[currentIndex + 1]  // Go to longer duration (less detailed)
      setCurrentScope(prevScope.key)
    }
  }, [currentScope])

  const panLeft = useCallback(() => {
    if (isAnimating) return
    // Move left by 50% of current viewport
    const panAmount = scopeConfig.duration * 0.5
    const targetTime = centerTime - panAmount
    animateCenterTime(targetTime)
  }, [centerTime, scopeConfig.duration, animateCenterTime, isAnimating])

  const panRight = useCallback(() => {
    if (isAnimating) return
    // Move right by 50% of current viewport
    const panAmount = scopeConfig.duration * 0.5
    const targetTime = centerTime + panAmount
    animateCenterTime(targetTime)
  }, [centerTime, scopeConfig.duration, animateCenterTime, isAnimating])

  const jumpToPreset = useCallback((presetScope: string) => {
    // Handle the new timeline header format (e.g., 'last-1-hour', 'first-30-minutes')
    let targetScope = presetScope
    let targetTime = Date.now()

    if (presetScope.startsWith('last-') || presetScope.startsWith('first-')) {
      // Extract the actual scope from 'last-1-hour' or 'first-30-minutes'
      const scopePart = presetScope.replace(/^(last-|first-)/, '')
      targetScope = scopePart

      // For 'first-' scopes, jump to the earliest data time
      if (presetScope.startsWith('first-')) {
        // Check if earliestDataTimestamp seems to be still the default fallback
        // Allow for some timing variations by checking if it's within the last 25 hours
        const now = Date.now()
        const timeDiff = now - earliestDataTimestamp
        const isLikelyDefaultFallback = timeDiff < (25 * 60 * 60 * 1000) && timeDiff > (23 * 60 * 60 * 1000)
        
        if (isLikelyDefaultFallback) {
          // If we don't have the actual earliest timestamp yet, use a more reasonable fallback
          // Go back far enough to likely capture early data
          targetTime = now - (7 * 24 * 60 * 60 * 1000) // Go back 7 days
        } else {
          targetTime = earliestDataTimestamp
        }
      }
    } else if (presetScope === 'all-time') {
      targetScope = 'all-time'
      // For all-time, center on a reasonable time point
      targetTime = Date.now() - (30 * 24 * 60 * 60 * 1000) // Go back 30 days
    }

    setCurrentScope(targetScope)
    animateCenterTime(targetTime, 500) // Longer animation for bigger jumps
  }, [animateCenterTime])

  const jumpToTime = useCallback((timestamp: number, scope?: string) => {
    if (scope && scope !== currentScope) {
      setCurrentScope(scope)
    }
    animateCenterTime(timestamp, 400)
  }, [currentScope, animateCenterTime])

  const canZoomIn = useMemo(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    return currentIndex > 0  // Can zoom in if not at most detailed level (index 0)
  }, [currentScope])

  const canZoomOut = useMemo(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
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
    setEarliestDataTimestamp
  }
}
