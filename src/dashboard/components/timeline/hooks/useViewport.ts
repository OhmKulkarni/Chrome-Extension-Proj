import { useState, useCallback, useMemo } from 'react'
import { ViewportRange, TIME_SCOPES } from '../types/timeline.types'

interface UseViewportProps {
  initialScope?: string
  initialCenterTime?: number
}

export const useViewport = ({ 
  initialScope = '5m', 
  initialCenterTime 
}: UseViewportProps = {}) => {
  const [currentScope, setCurrentScope] = useState<string>(initialScope)
  const [centerTime, setCenterTime] = useState<number>(
    initialCenterTime || Date.now()
  )

  const scopeConfig = useMemo(() => {
    return TIME_SCOPES.find(scope => scope.key === currentScope) || TIME_SCOPES[4] // Default to 5m
  }, [currentScope])

  const viewport = useMemo<ViewportRange>(() => {
    const halfDuration = scopeConfig.duration / 2
    return {
      startTime: centerTime - halfDuration,
      endTime: centerTime + halfDuration,
      duration: scopeConfig.duration
    }
  }, [centerTime, scopeConfig.duration])

  const zoomIn = useCallback(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    if (currentIndex < TIME_SCOPES.length - 1) {
      const nextScope = TIME_SCOPES[currentIndex + 1]
      setCurrentScope(nextScope.key)
    }
  }, [currentScope])

  const zoomOut = useCallback(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    if (currentIndex > 0) {
      const prevScope = TIME_SCOPES[currentIndex - 1]
      setCurrentScope(prevScope.key)
    }
  }, [currentScope])

  const panLeft = useCallback(() => {
    // Move left by 50% of current viewport
    const panAmount = scopeConfig.duration * 0.5
    setCenterTime(prev => prev - panAmount)
  }, [scopeConfig.duration])

  const panRight = useCallback(() => {
    // Move right by 50% of current viewport
    const panAmount = scopeConfig.duration * 0.5
    setCenterTime(prev => prev + panAmount)
  }, [scopeConfig.duration])

  const jumpToPreset = useCallback((presetScope: string) => {
    setCurrentScope(presetScope)
    setCenterTime(Date.now()) // Reset to current time
  }, [])

  const jumpToTime = useCallback((timestamp: number, scope?: string) => {
    setCenterTime(timestamp)
    if (scope && scope !== currentScope) {
      setCurrentScope(scope)
    }
  }, [currentScope])

  const canZoomIn = useMemo(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    return currentIndex < TIME_SCOPES.length - 1
  }, [currentScope])

  const canZoomOut = useMemo(() => {
    const currentIndex = TIME_SCOPES.findIndex(scope => scope.key === currentScope)
    return currentIndex > 0
  }, [currentScope])

  return {
    viewport,
    currentScope,
    scopeConfig,
    centerTime,
    zoomLevel: scopeConfig.zoomLevel,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
    jumpToPreset,
    jumpToTime,
    setCenterTime
  }
}
