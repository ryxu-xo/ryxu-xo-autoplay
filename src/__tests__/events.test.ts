import { AutoplayEventEmitter } from '../events';
import { AutoplayEventType, LavalinkTrackInfo } from '../types';

describe('AutoplayEventEmitter', () => {
  let eventEmitter: AutoplayEventEmitter;

  beforeEach(() => {
    eventEmitter = new AutoplayEventEmitter();
  });

  describe('event emission', () => {
    it('should emit events with correct data structure', () => {
      const listener = jest.fn();
      eventEmitter.onEvent('trackFound', listener);

      const trackInfo: LavalinkTrackInfo = {
        identifier: 'test',
        sourceName: 'youtube',
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'test'
      };

      eventEmitter.emitTrackFound({ trackInfo });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'trackFound',
          trackInfo,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should emit wildcard events', () => {
      const wildcardListener = jest.fn();
      const specificListener = jest.fn();
      
      eventEmitter.onAllEvents(wildcardListener);
      eventEmitter.onEvent('error', specificListener);

      eventEmitter.emitError({});

      expect(wildcardListener).toHaveBeenCalled();
      expect(specificListener).toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      
      eventEmitter.onEvent('trackFound', listener);
      expect(eventEmitter.getListenerCountForEvent('trackFound')).toBe(1);
      
      eventEmitter.offEvent('trackFound', listener);
      expect(eventEmitter.getListenerCountForEvent('trackFound')).toBe(0);
    });

    it('should add one-time event listeners', () => {
      const listener = jest.fn();
      
      eventEmitter.onceEvent('trackFound', listener);
      expect(eventEmitter.getListenerCountForEvent('trackFound')).toBe(1);
      
      eventEmitter.emitTrackFound({});
      expect(listener).toHaveBeenCalledTimes(1);
      
      eventEmitter.emitTrackFound({});
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should remove all listeners for specific event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      eventEmitter.onEvent('trackFound', listener1);
      eventEmitter.onEvent('trackFound', listener2);
      expect(eventEmitter.getListenerCountForEvent('trackFound')).toBe(2);
      
      eventEmitter.removeAllListenersForEvent('trackFound');
      expect(eventEmitter.getListenerCountForEvent('trackFound')).toBe(0);
    });

    it('should check if listeners exist', () => {
      expect(eventEmitter.hasListenersForEvent('trackFound')).toBe(false);
      
      const listener = jest.fn();
      eventEmitter.onEvent('trackFound', listener);
      
      expect(eventEmitter.hasListenersForEvent('trackFound')).toBe(true);
    });
  });

  describe('specific event methods', () => {
    it('should emit track found event', () => {
      const listener = jest.fn();
      eventEmitter.onEvent('trackFound', listener);
      
      eventEmitter.emitTrackFound({ source: 'youtube' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'trackFound',
          source: 'youtube'
        })
      );
    });

    it('should emit error event', () => {
      const listener = jest.fn();
      eventEmitter.onEvent('error', listener);
      
      const error = new Error('Test error');
      eventEmitter.emitError({ error });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error
        })
      );
    });

    it('should emit provider error event', () => {
      const listener = jest.fn();
      eventEmitter.onEvent('providerError', listener);
      
      eventEmitter.emitProviderError({ source: 'spotify' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'providerError',
          source: 'spotify'
        })
      );
    });

    it('should emit rate limited event', () => {
      const listener = jest.fn();
      eventEmitter.onEvent('rateLimited', listener);
      
      eventEmitter.emitRateLimited({ source: 'youtube' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rateLimited',
          source: 'youtube'
        })
      );
    });

    it('should emit timeout event', () => {
      const listener = jest.fn();
      eventEmitter.onEvent('timeout', listener);
      
      eventEmitter.emitTimeout({ source: 'soundcloud' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timeout',
          source: 'soundcloud'
        })
      );
    });

    it('should emit success event', () => {
      const listener = jest.fn();
      eventEmitter.onEvent('success', listener);
      
      eventEmitter.emitSuccess({ source: 'youtube' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          source: 'youtube'
        })
      );
    });
  });
});
