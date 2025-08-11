import fetch from 'node-fetch';
import { fileTypeFromBuffer } from 'file-type';
import { URL } from 'url';

export interface InlineDataResult {
  data: string; // base64 encoded
  mimeType: string;
}

// SSRF protection: list of disallowed networks and hostnames
const DISALLOWED_NETWORKS = [
  /^127\./,        // 127.0.0.0/8 (localhost)
  /^10\./,         // 10.0.0.0/8 (private)
  /^192\.168\./,   // 192.168.0.0/16 (private)
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12 (private)
  /^169\.254\./,   // 169.254.0.0/16 (link-local)
  /^::1$/,         // IPv6 localhost
  /^fc00::/,       // IPv6 private
  /^fe80::/        // IPv6 link-local
];

const DISALLOWED_HOSTNAMES = [
  'localhost',
  '0.0.0.0',
  'metadata.google.internal',
  '169.254.169.254'
];

/**
 * Validates URL to prevent SSRF attacks
 */
function validateUrl(urlString: string): void {
  let parsedUrl: URL;
  
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  // Only allow HTTP and HTTPS
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed.`);
  }

  // Check hostname against disallowed list
  const hostname = parsedUrl.hostname.toLowerCase();
  if (DISALLOWED_HOSTNAMES.includes(hostname)) {
    throw new Error(`Access to hostname '${hostname}' is not allowed`);
  }

  // Check IP addresses against private/reserved ranges
  for (const pattern of DISALLOWED_NETWORKS) {
    if (pattern.test(hostname)) {
      throw new Error(`Access to IP range '${hostname}' is not allowed`);
    }
  }
}

/**
 * Parses data: URLs and extracts mime type and base64 data
 */
function parseDataUrl(dataUrl: string): InlineDataResult {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)/);
  if (!match) {
    throw new Error("Invalid data URL format");
  }

  const [, mimeType = "application/octet-stream", isBase64, data] = match;
  
  if (!isBase64) {
    throw new Error("Only base64-encoded data URLs are supported");
  }

  // Validate base64
  try {
    Buffer.from(data, 'base64');
  } catch (error) {
    throw new Error("Invalid base64 data in data URL");
  }

  return { data, mimeType };
}

/**
 * Fetches media from a URL and converts it to inline data format for Gemini API
 */
export async function fetchAsInlineData(url: string, mimeHint?: string): Promise<InlineDataResult> {
  try {
    console.error(`Fetching media from URL: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
    
    // Handle data: URLs
    if (url.startsWith('data:')) {
      const result = parseDataUrl(url);
      console.error(`Data URL parsed: ${result.mimeType}, ${result.data.length} base64 chars`);
      return result;
    }

    // Validate URL for SSRF protection
    validateUrl(url);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Gemini-MCP-Server/1.0'
        },
        redirect: 'follow', // Allow up to 5 redirects (fetch default)
        size: 25 * 1024 * 1024 // 25MB limit
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${url} - ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      // Validate size after download
      const sizeMB = buffer.byteLength / (1024 * 1024);
      if (sizeMB > 20) {
        throw new Error(`Media file too large: ${sizeMB.toFixed(2)} MB (limit: 20 MB)`);
      }
      
      // Try to determine MIME type from various sources
      let mimeType = mimeHint;
      
      // First try HTTP Content-Type header
      if (!mimeType) {
        mimeType = response.headers.get("content-type") || undefined;
      }
      
      // Then try file-type detection from buffer (magic bytes)
      if (!mimeType) {
        try {
          const fileType = await fileTypeFromBuffer(uint8Array);
          mimeType = fileType?.mime;
        } catch (error) {
          console.error("File type detection failed:", error);
        }
      }
      
      // Fallback to generic binary type
      if (!mimeType) {
        mimeType = "application/octet-stream";
      }

      const base64Data = Buffer.from(uint8Array).toString("base64");
      
      console.error(`Media fetched successfully: ${mimeType}, ${base64Data.length} base64 chars`);
      
      return {
        data: base64Data,
        mimeType
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout fetching media from ${url}`);
    }
    console.error(`Error fetching media from ${url}:`, error);
    throw error;
  }
}

/**
 * Validates if a MIME type is supported by Gemini for the given media type
 */
export function validateMimeType(mimeType: string, mediaType: 'image' | 'audio' | 'video'): boolean {
  const supportedTypes = {
    image: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif'
    ],
    audio: [
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac',
      'audio/ogg', 'audio/flac'
    ],
    video: [
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/flv',
      'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
    ]
  };

  return supportedTypes[mediaType].includes(mimeType.toLowerCase());
}

/**
 * Gets the media type from a MIME type
 */
export function getMediaType(mimeType: string): 'image' | 'audio' | 'video' | 'unknown' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'unknown';
}

/**
 * Validates the size of base64 data (Gemini has limits)
 */
export function validateDataSize(base64Data: string, maxSizeMB = 20): boolean {
  // Base64 encoding increases size by ~33%, so calculate approximate original size
  const approximateOriginalSize = (base64Data.length * 3) / 4;
  const sizeMB = approximateOriginalSize / (1024 * 1024);
  
  console.error(`Media size: ~${sizeMB.toFixed(2)} MB (limit: ${maxSizeMB} MB)`);
  
  return sizeMB <= maxSizeMB;
}

/**
 * Validates buffer size before base64 encoding
 */
export function validateBufferSize(buffer: ArrayBuffer | Buffer, maxSizeMB = 20): boolean {
  const sizeMB = buffer.byteLength / (1024 * 1024);
  return sizeMB <= maxSizeMB;
}