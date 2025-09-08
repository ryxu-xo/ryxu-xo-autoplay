// Main exports
export { LavalinkAutoplay } from './autoplay';
export { AutoplayEventEmitter } from './events';

// Type exports
export type {
  LavalinkTrackInfo,
  AutoplayResult,
  AutoplayConfig,
  ProviderConfig,
  AutoplaySource,
  AutoplayEventType,
  AutoplayEventData,
  AutoplayEventListener,
  AutoplayProvider,
  SpotifyTrack,
  SoundCloudTrack,
  YouTubeTrack,
  RequestOptions
} from './types';

// Error exports
export {
  AutoplayError,
  ProviderError,
  RateLimitError,
  TimeoutError
} from './types';

// Provider exports
export {
  BaseProvider,
  YouTubeProvider,
  SpotifyProvider,
  SoundCloudProvider
} from './providers';

// Utility exports
export { createHttpAgent, fetchPage, parseJsonResponse } from './utils/http';

// Default export
import { LavalinkAutoplay } from './autoplay';
export default LavalinkAutoplay;
