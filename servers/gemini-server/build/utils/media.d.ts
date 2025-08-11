export interface InlineDataResult {
    data: string;
    mimeType: string;
}
/**
 * Fetches media from a URL and converts it to inline data format for Gemini API
 */
export declare function fetchAsInlineData(url: string, mimeHint?: string): Promise<InlineDataResult>;
/**
 * Validates if a MIME type is supported by Gemini for the given media type
 */
export declare function validateMimeType(mimeType: string, mediaType: 'image' | 'audio' | 'video'): boolean;
/**
 * Gets the media type from a MIME type
 */
export declare function getMediaType(mimeType: string): 'image' | 'audio' | 'video' | 'unknown';
/**
 * Validates the size of base64 data (Gemini has limits)
 */
export declare function validateDataSize(base64Data: string, maxSizeMB?: number): boolean;
/**
 * Validates buffer size before base64 encoding
 */
export declare function validateBufferSize(buffer: ArrayBuffer | Buffer, maxSizeMB?: number): boolean;
//# sourceMappingURL=media.d.ts.map