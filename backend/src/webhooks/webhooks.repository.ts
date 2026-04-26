import { AppDataSource } from "../database/data-source";
import { WebhookDelivery } from "./webhook-delivery.entity";

export const webhookRepo = AppDataSource.getRepository(WebhookDelivery);

export async function saveDelivery(delivery: Partial<WebhookDelivery>) {
  return webhookRepo.save(delivery);
}

export async function getDeliveryHistory(webhookId: string) {
  return webhookRepo.find({
    where: { webhookId },
    order: { createdAt: "DESC" },
  });
}
