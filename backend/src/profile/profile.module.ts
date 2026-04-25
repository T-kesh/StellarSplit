import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './profile.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { CurrencyModule } from '../modules/currency/currency.module';
import { ProfilePolicyGuard } from './profile-policy.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile]),
    CurrencyModule,
    AuthModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, ProfilePolicyGuard],
  exports: [ProfileService],
})
export class ProfileModule {}
