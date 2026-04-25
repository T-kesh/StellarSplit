import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SplitShortLink } from "./entities/split-short-link.entity";
import { LinkAccessLog } from "./entities/link-access-log.entity";
import { ShortLinksService } from "./short-links.service";
import { ShortLinksController } from "./short-links.controller";
import { NfcPayloadService } from "./nfc-payload.service";
import { ShortLinkUrlBuilder } from "./short-link-url.builder";

@Module({
  imports: [TypeOrmModule.forFeature([SplitShortLink, LinkAccessLog])],
  providers: [ShortLinksService, NfcPayloadService, ShortLinkUrlBuilder],
  controllers: [ShortLinksController],
})
export class ShortLinksModule {}
