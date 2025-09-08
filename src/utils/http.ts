import * as https from 'https';
import { RequestOptions } from '../types';

/**
 * HTTP agent configuration for better performance
 */
export const createHttpAgent = (): https.Agent => {
  return new https.Agent({
    keepAlive: true,
    timeout: 8000,
    maxSockets: 5,
    maxFreeSockets: 2
  });
};

/**
 * Default headers for requests
 */
export const getDefaultHeaders = (): Record<string, string> => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/json,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
});

/**
 * Enhanced fetch function with better error handling and retries
 */
export async function fetchPage(
  url: string, 
  options: RequestOptions = {}, 
  attempt: number = 0
): Promise<string> {
  const defaultHeaders = getDefaultHeaders();
  const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };
  
  const requestOptions: https.RequestOptions = {
    ...options,
    headers: mergedHeaders,
    agent: options.agent || createHttpAgent()
  };

  return new Promise((resolve, reject) => {
    const req = https.get(url, requestOptions, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const nextUrl = new URL(res.headers.location, url).href;
        return fetchPage(nextUrl, options, attempt)
          .then(resolve)
          .catch(reject);
      }

      // Handle non-200 status codes
      if (res.statusCode && res.statusCode !== 200) {
        res.resume();
        const error = new Error(`Request failed with status: ${res.statusCode}`);
        
        if (attempt < (options.retries || 2)) {
          const delay = 200 * (attempt + 1);
          setTimeout(() => {
            fetchPage(url, options, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
          return;
        }
        
        return reject(error);
      }

      // Collect response data
      const data: Buffer[] = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        try {
          const response = Buffer.concat(data).toString();
          resolve(response);
        } catch (err) {
          reject(new Error('Failed to parse response data'));
        }
      });
    });

    req.on('error', (err) => {
      if (attempt < (options.retries || 2)) {
        const delay = 200 * (attempt + 1);
        setTimeout(() => {
          fetchPage(url, options, attempt + 1)
            .then(resolve)
            .catch(reject);
        }, delay);
        return;
      }
      reject(err);
    });

    // Set timeout
    const timeout = options.timeout || 8000;
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Request timed out after ${timeout}ms`));
    });
  });
}

/**
 * Parse JSON response with error handling
 */
export function parseJsonResponse<T = any>(data: string): T {
  try {
    return JSON.parse(data);
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Extract URL from redirect response
 */
export function extractRedirectUrl(response: any, baseUrl: string): string | null {
  if (response?.headers?.location) {
    return new URL(response.headers.location, baseUrl).href;
  }
  return null;
}
