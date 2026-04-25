import { Injectable } from '@nestjs/common';
import { ShortLinksService } from './short-links.service';

@Injectable()
export class NfcPayloadService {
  constructor(private readonly shortLinksService: ShortLinksService) {}

  /**
   * Generate NDEF payload for NFC tag with URL and validation
   * @param url - The URL to embed in the NFC tag
   * @param splitId - The split ID (for access validation)
   * @param userId - The user's wallet address (for authorization)
   * @returns NDEF message structure for NFC tag programming
   */
  async generateNdefPayload(
    url: string,
    splitId: string,
    userId: string,
  ): Promise<{ ndefMessage: { tnf: number; type: string; payload: string } }> {
    // Validate user has access to this split for NFC generation
    await this.shortLinksService.validateNfcAccess(userId, splitId);

    const uriRecord = Buffer.from(url, 'utf8');

    return {
      ndefMessage: {
        tnf: 1,
        type: 'U',
        payload: uriRecord.toString('hex'),
      },
    };
  }
}