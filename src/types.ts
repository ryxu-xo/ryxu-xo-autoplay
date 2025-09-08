/**
 * Supported autoplay sources
 */
export type AutoplaySource = 'youtube' | 'spotify' | 'soundcloud';

/**
 * Autoplay event types
 */
export type AutoplayEventType = 
  | 'trackFound'
  | 'trackNotFound'
  | 'error'
  | 'providerError'
  | 'rateLimited'
  | 'timeout'
  | 'success';

/**
 * Lavalink track information interface
 */
export interface LavalinkTrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
  sourceName: AutoplaySource;
  artworkUrl?: string;
  isrc?: string;
}

/**
 * Autoplay result interface
 */
export interface AutoplayResult {
  success: boolean;
  url?: string;
  trackId?: string;
  source?: AutoplaySource;
  error?: string;
  metadata?: Record<string, any> | undefined;
}

/**
 * Autoplay event data
 */
export interface AutoplayEventData {
  type: AutoplayEventType;
  source?: AutoplaySource;
  trackInfo?: LavalinkTrackInfo;
  error?: Error;
  result?: AutoplayResult;
  metadata?: Record<string, any> | undefined;
  timestamp: number;
}

/**
 * Autoplay configuration options
 */
export interface AutoplayConfig {
  maxRetries?: number;
  timeout?: number;
  enableEvents?: boolean;
  rateLimitDelay?: number;
  userAgent?: string;
  customHeaders?: Record<string, string>;
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  spotify?: {
    totpSecret?: string;
    maxRecommendations?: number;
  };
  soundcloud?: {
    maxTracks?: number;
    baseUrl?: string;
  };
  youtube?: {
    enableRadioMode?: boolean;
  };
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  agent?: any;
}

/**
 * Spotify track data
 */
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
}

/**
 * SoundCloud track data
 */
export interface SoundCloudTrack {
  id: number;
  title: string;
  user: {
    username: string;
    avatar_url: string;
  };
  artwork_url?: string;
  duration: number;
  permalink_url: string;
}

/**
 * YouTube track data
 */
export interface YouTubeTrack {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  url: string;
}

/**
 * Event listener function type
 */
export type AutoplayEventListener = (data: AutoplayEventData) => void;

/**
 * Provider interface for autoplay implementations
 */
export interface AutoplayProvider {
  readonly name: AutoplaySource;
  canHandle(trackInfo: LavalinkTrackInfo): boolean;
  getNextTrack(trackInfo: LavalinkTrackInfo): Promise<AutoplayResult>;
}

/**
 * Error types for better error handling
 */
export class AutoplayError extends Error {
  constructor(
    message: string,
    public readonly source?: AutoplaySource,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AutoplayError';
  }
}

export class ProviderError extends AutoplayError {
  constructor(
    message: string,
    public readonly provider: AutoplaySource,
    public readonly originalError?: Error
  ) {
    super(message, provider, 'PROVIDER_ERROR', true);
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends AutoplayError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, undefined, 'RATE_LIMITED', true);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends AutoplayError {
  constructor(
    message: string,
    public readonly timeout: number
  ) {
    super(message, undefined, 'TIMEOUT', true);
    this.name = 'TimeoutError';
  }
}
