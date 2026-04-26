import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SplitShortLink } from './entities/split-short-link.entity';
import { LinkAccessLog } from './entities/link-access-log.entity';
import { GenerateLinkDto } from './dto/generate-link.dto';
import { AuthorizationService } from '../auth/services/authorization.service';
import { ShortLinkUrlBuilder } from './short-link-url.builder';
import * as crypto from 'crypto';

@Injectable()
export class ShortLinksService {
  private readonly logger = new Logger(ShortLinksService.name);

  constructor(
    @InjectRepository(SplitShortLink)
    private shortLinkRepo: Repository<SplitShortLink>,

    @InjectRepository(LinkAccessLog)
    private accessLogRepo: Repository<LinkAccessLog>,

    private readonly authorizationService: AuthorizationService,
    private readonly urlBuilder: ShortLinkUrlBuilder,
  ) {}

  // Generate 6-char unique short code
  private async generateUniqueCode(): Promise<string> {
    let code = crypto.randomBytes(4).toString('base64url').slice(0, 6);
    let exists = true;
    while (exists) {
      code = crypto.randomBytes(4).toString('base64url').slice(0, 6);
      const found = await this.shortLinkRepo.findOne({ where: { shortCode: code } });
      exists = !!found;
    }
    return code;
  }

  // ? Generate link - now checks split ownership
  async generate(dto: GenerateLinkDto, wallet: string) {
    // Check user is allowed to generate a link for this split
    const canGenerate = await this.authorizationService.canGenerateShortLink(wallet, dto.splitId);
    if (!canGenerate) {
      throw new ForbiddenException('You are not a member of this split');
    }

    // If a target participant is provided, make sure they belong to this split
    if (dto.targetParticipantId) {
      const validParticipant = await this.authorizationService.isParticipantInSplit(
        dto.targetParticipantId,
        dto.splitId,
      );
      if (!validParticipant) {
        throw new BadRequestException('Target participant does not belong to this split');
      }
    }

    // Check link count limit per user per split
    const count = await this.shortLinkRepo.count({
      where: {
        split: { id: dto.splitId },
        createdBy: wallet,
      },
    });
    if (count >= 20) {
      throw new ForbiddenException('Link generation limit reached');
    }

    const shortCode = await this.generateUniqueCode();

    const expiry = dto.expiryHours
      ? new Date(Date.now() + dto.expiryHours * 3_600_000)
      : new Date(Date.now() + 72 * 3_600_000);

    const link = this.shortLinkRepo.create({
      split: { id: dto.splitId } as any,
      shortCode,
      linkType: dto.linkType,
      targetParticipant: dto.targetParticipantId
        ? ({ id: dto.targetParticipantId } as any)
        : undefined,
      expiresAt: expiry,
      maxAccesses: dto.maxAccesses,
      createdBy: wallet,
    });

    await this.shortLinkRepo.save(link);

    return {
      shortCode,
      url: this.urlBuilder.buildShortLinkUrl(shortCode),
      sep0007: this.urlBuilder.buildSep0007Uri(dto.splitId),
      expiresAt: expiry,
    };
  }

  // ? Resolve link - checks expiry and max access
  async resolve(shortCode: string, ip: string, userAgent: string, userId?: string) {
    const link = await this.shortLinkRepo.findOne({
      where: { shortCode },
      relations: ['split'],
    });

    if (!link) throw new NotFoundException('Link not found');

    // Check expiry
    if (link.expiresAt < new Date()) {
      throw new BadRequestException('Link has expired');
    }

    // Check max access limit
    if (link.maxAccesses && link.accessCount >= link.maxAccesses) {
      throw new ForbiddenException('This link has reached its maximum number of uses');
    }

    // Increment access count
    link.accessCount++;
    await this.shortLinkRepo.save(link);

    // Log access
    await this.accessLogRepo.save({
      shortLink: link,
      ipHash: crypto.createHash('sha256').update(ip).digest('hex'),
      userAgent,
      resolvedUserId: userId,
    });

    return {
      redirectUrl: this.urlBuilder.buildSplitUrl(link.split.id),
      linkType: link.linkType,
    };
  }

  // ? Analytics - only split creator can view
  async analytics(shortCode: string, userId: string) {
    const link = await this.shortLinkRepo.findOne({
      where: { shortCode },
      relations: ['split'],
    });

    if (!link) throw new NotFoundException('Link not found');

    // Only the split creator can see analytics
    const canView = await this.authorizationService.canViewShortLinkAnalytics(
      userId,
      link.split.id,
    );
    if (!canView) {
      throw new ForbiddenException('Only the split creator can view analytics');
    }

    const logs = await this.accessLogRepo.find({
      where: { shortLink: { shortCode } },
    });

    return {
      totalAccess: logs.length,
      uniqueIPs: new Set(logs.map((l) => l.ipHash)).size,
      lastAccess: [...logs].sort(
        (a, b) => b.accessedAt.getTime() - a.accessedAt.getTime(),
      )[0] ?? null,
    };
  }

  // ? Delete - only split creator can delete
  async remove(shortCode: string, userId: string): Promise<void> {
    const link = await this.shortLinkRepo.findOne({
      where: { shortCode },
      relations: ['split'],
    });

    if (!link) throw new NotFoundException('Short link not found');

    // Only split creator can delete links
    const canDelete = await this.authorizationService.canDeleteShortLink(
      userId,
      link.split.id,
    );
    if (!canDelete) {
      throw new ForbiddenException('Only the split creator can delete links');
    }

    await this.shortLinkRepo.delete({ shortCode });
  }

  /**
   * Validate that a user has access to generate NFC payloads for a split
   * @param userId - User's wallet address
   * @param splitId - Split identifier
   * @throws ForbiddenException if user is not a member of the split
   */
  async validateNfcAccess(userId: string, splitId: string): Promise<void> {
    const canGenerate = await this.authorizationService.canGenerateShortLink(userId, splitId);
    if (!canGenerate) {
      throw new ForbiddenException('You are not a member of this split');
    }
  }
}
