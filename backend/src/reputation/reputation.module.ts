import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReputation } from './entities/user-reputation.entity';
import { ReputationEvent } from './entities/reputation-event.entity';
import { ReputationService } from './reputation.service';
import { ScoreCalculatorService } from './score-calculator.service';
import { ReputationController } from './reputation.controller';
import { DisputeReputationListener } from './listeners/dispute-reputation.listener';

@Module({
  imports: [TypeOrmModule.forFeature([UserReputation, ReputationEvent])],
  controllers: [ReputationController],
  providers: [ReputationService, ScoreCalculatorService, DisputeReputationListener],
  exports: [ReputationService],
})
export class ReputationModule {}
