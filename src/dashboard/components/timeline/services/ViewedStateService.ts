import { ViewedTrackingSettings } from '../types/timeline.types'

export interface ViewedEventData {
  eventId: string
  viewedAt: number
  persistenceLevel: string
}

export class ViewedStateService {
  private static instance: ViewedStateService
  private storageKey = 'timeline-viewed-events'
  private settingsKey = 'timeline-viewed-settings'

  static getInstance(): ViewedStateService {
    if (!ViewedStateService.instance) {
      ViewedStateService.instance = new ViewedStateService()
    }
    return ViewedStateService.instance
  }

  // Load viewed events from storage
  loadViewedEvents(): Map<string, number> {
    try {
      const _stored = localStorage.getItem(this.storageKey)
      if (!stored) return new Map()

      const data: ViewedEventData[] = JSON.parse(stored)
      const _now = Date.now()
      const _settings = this.loadSettings()

      // Filter out expired events based on current settings
      const _validEvents = data.filter(item => {
        return this.isViewedEventValid(item.viewedAt, item.persistenceLevel, settings, now)
      })

      // Save back filtered events to clean up expired ones
      this.saveViewedEventsData(validEvents)

      // Convert to Map
      const _viewedMap = new Map<string, number>()
      validEvents.forEach(item => {
        viewedMap.set(item.eventId, item.viewedAt)
      })

      return viewedMap
    } catch (error) {
      // console.warn('Failed to load viewed events from storage:', error)
      return new Map()
    }
  }

  // Save viewed events to storage
  saveViewedEvents(viewedEvents: Map<string, number>, settings: ViewedTrackingSettings): void {
    try {
      const data: ViewedEventData[] = Array.from(viewedEvents.entries()).map(([eventId, viewedAt]) => ({
        eventId,
        viewedAt,
        persistenceLevel: settings.persistenceLevel
      }))

      this.saveViewedEventsData(data)
    } catch (error) {
      // console.warn('Failed to save viewed events to storage:', error)
    }
  }

  private saveViewedEventsData(data: ViewedEventData[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  // Mark single event as viewed
  markEventAsViewed(eventId: string, settings: ViewedTrackingSettings): void {
    const _viewedEvents = this.loadViewedEvents()
    viewedEvents.set(eventId, Date.now())
    this.saveViewedEvents(viewedEvents, settings)
  }

  // Check if an event should be considered viewed based on settings and time
  isEventViewed(eventId: string, settings: ViewedTrackingSettings): boolean {
    if (!settings.enabled) return false

    const _viewedEvents = this.loadViewedEvents()
    const _viewedTime = viewedEvents.get(eventId)
    if (!viewedTime) return false

    return this.isViewedEventValid(viewedTime, settings.persistenceLevel, settings, Date.now())
  }

  private isViewedEventValid(
    viewedTime: number,
    _originalPersistenceLevel: string,
    currentSettings: ViewedTrackingSettings,
    now: number
  ): boolean {
    // For session-only events, they expire when settings change or on component remount
    // But we'll handle session logic differently - session events expire on navigation

    switch (currentSettings.persistenceLevel) {
      case 'session':
        // Session events are handled in-memory, not in localStorage
        return false
      case 'medium':
        // 30 minutes
        return now - viewedTime < 30 * 60 * 1000
      case 'permanent':
        return true
      default:
        return false
    }
  }

  // Load settings from storage
  loadSettings(): ViewedTrackingSettings {
    try {
      const _stored = localStorage.getItem(this.settingsKey)
      if (!stored) {
        // Return default settings
        return {
          enabled: true,
          persistenceLevel: 'session',
          showIndicators: true,
          viewedOpacity: 0.75
        }
      }
      return JSON.parse(stored)
    } catch (error) {
      // console.warn('Failed to load viewed tracking settings:', error)
      return {
        enabled: true,
        persistenceLevel: 'session',
        showIndicators: true,
        viewedOpacity: 0.75
      }
    }
  }

  // Save settings to storage
  saveSettings(settings: ViewedTrackingSettings): void {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings))
    } catch (error) {
      // console.warn('Failed to save viewed tracking settings:', error)
    }
  }

  // Clear all viewed events
  clearAllViewedEvents(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      // console.warn('Failed to clear viewed events:', error)
    }
  }

  // Clear expired events (cleanup utility)
  cleanupExpiredEvents(settings: ViewedTrackingSettings): void {
    const _viewedEvents = this.loadViewedEvents()
    this.saveViewedEvents(viewedEvents, settings) // This will filter out expired events
  }

  // Get count of stored viewed events
  getViewedEventsCount(): number {
    try {
      const _stored = localStorage.getItem(this.storageKey)
      if (!stored) return 0
      const data: ViewedEventData[] = JSON.parse(stored)
      return data.length
    } catch (error) {
      return 0
    }
  }
}

export const _viewedStateService = ViewedStateService.getInstance()
