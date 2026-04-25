import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized builder for short-link URLs
 * Ensures consistent URL generation across the application
 * Uses environment configuration for the frontend base URL
 */
@Injectable()
export class ShortLinkUrlBuilder {
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
  }

  /**
   * Build the public short-link redirect URL
   * @param shortCode - The unique short code identifier
   * @returns Full public URL for the short link
   */
  buildShortLinkUrl(shortCode: string): string {
    return `${this.frontendUrl}/l/${shortCode}`;
  }

  /**
   * Build the split detail page URL
   * @param splitId - The split identifier
   * @returns Full public URL for the split
   */
  buildSplitUrl(splitId: string): string {
    return `${this.frontendUrl}/splits/${splitId}`;
  }

  /**
   * Build a Stellar SEP-0007 payment URI
   * Used for deep-linking to wallet payment flows
   * @param splitId - The split identifier for the payment memo
   * @returns SEP-0007 compliant payment URI
   */
  buildSep0007Uri(splitId: string): string {
    return `web+stellar:pay?memo=${encodeURIComponent(`split:${splitId}`)}`;
  }

  /**
   * Build an NFC-embeddable split URL
   * @param splitId - The split identifier
   * @returns URL suitable for NFC tag payload
   */
  buildNfcUrl(splitId: string): string {
    return this.buildSplitUrl(splitId);
  }

  /**
   * Get the configured frontend base URL
   * @returns The frontend URL from configuration
   */
  getFrontendUrl(): string {
    return this.frontendUrl;
  }
}
