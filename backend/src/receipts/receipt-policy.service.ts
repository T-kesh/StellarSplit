import { Injectable } from "@nestjs/common";
import { AuthorizationService } from "../auth/services/authorization.service";

@Injectable()
export class ReceiptPolicyService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canCreateReceipt(userId: string, splitId?: string): Promise<boolean> {
    if (!splitId) {
      // Standalone receipt uploads are permitted for any authenticated user.
      return true;
    }
    return this.authorizationService.canAccessSplit(userId, splitId);
  }

  async canAccessReceipt(userId: string, receiptId: string): Promise<boolean> {
    return this.authorizationService.canAccessReceipt(userId, receiptId);
  }

  async canDeleteReceipt(userId: string, receiptId: string): Promise<boolean> {
    return this.authorizationService.canAccessReceipt(userId, receiptId);
  }
}
