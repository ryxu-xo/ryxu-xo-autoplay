import { EventEmitter } from 'events';
import { AutoplayEventData, AutoplayEventListener, AutoplayEventType } from './types';

/**
 * Event system for autoplay functionality
 */
export class AutoplayEventEmitter extends EventEmitter {
  private readonly maxListeners = 50;

  constructor() {
    super();
    this.setMaxListeners(this.maxListeners);
  }

  /**
   * Emit an autoplay event
   */
  emitEvent(type: AutoplayEventType, data: Partial<AutoplayEventData> = {}): void {
    const eventData: AutoplayEventData = {
      type,
      timestamp: Date.now(),
      ...data
    };

    this.emit(type, eventData);
    this.emit('*', eventData); // Wildcard event for all events
  }

  /**
   * Add event listener for specific event type
   */
  onEvent(type: AutoplayEventType, listener: AutoplayEventListener): this {
    return this.on(type, listener);
  }

  /**
   * Add event listener for all events
   */
  onAllEvents(listener: AutoplayEventListener): this {
    return this.on('*', listener);
  }

  /**
   * Add one-time event listener
   */
  onceEvent(type: AutoplayEventType, listener: AutoplayEventListener): this {
    return this.once(type, listener);
  }

  /**
   * Remove event listener
   */
  offEvent(type: AutoplayEventType, listener: AutoplayEventListener): this {
    return this.off(type, listener);
  }

  /**
   * Remove all listeners for a specific event type
   */
  removeAllListenersForEvent(type: AutoplayEventType): this {
    return this.removeAllListeners(type);
  }

  /**
   * Get listener count for specific event type
   */
  getListenerCountForEvent(type: AutoplayEventType): number {
    return this.listenerCount(type);
  }

  /**
   * Check if there are listeners for specific event type
   */
  hasListenersForEvent(type: AutoplayEventType): boolean {
    return this.listenerCount(type) > 0;
  }

  /**
   * Emit track found event
   */
  emitTrackFound(data: Partial<AutoplayEventData>): void {
    this.emitEvent('trackFound', data);
  }

  /**
   * Emit track not found event
   */
  emitTrackNotFound(data: Partial<AutoplayEventData>): void {
    this.emitEvent('trackNotFound', data);
  }

  /**
   * Emit error event
   */
  emitError(data: Partial<AutoplayEventData>): void {
    this.emitEvent('error', data);
  }

  /**
   * Emit provider error event
   */
  emitProviderError(data: Partial<AutoplayEventData>): void {
    this.emitEvent('providerError', data);
  }

  /**
   * Emit rate limit event
   */
  emitRateLimited(data: Partial<AutoplayEventData>): void {
    this.emitEvent('rateLimited', data);
  }

  /**
   * Emit timeout event
   */
  emitTimeout(data: Partial<AutoplayEventData>): void {
    this.emitEvent('timeout', data);
  }

  /**
   * Emit success event
   */
  emitSuccess(data: Partial<AutoplayEventData>): void {
    this.emitEvent('success', data);
  }
}
