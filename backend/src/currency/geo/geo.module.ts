import { Module } from "@nestjs/common";
import { GeoService } from "./geo.service";
import { GeoController } from "./geo.controller";

@Module({
  imports: [],
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
