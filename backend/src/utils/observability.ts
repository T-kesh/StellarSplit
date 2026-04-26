export const logger = {
  info(payload: Record<string, unknown>) {
    console.info(JSON.stringify(payload));
  },
};

export function logDelivery(url: string, status: string, attempt: number, error?: string) {
  logger.info({
    event: "webhook_delivery",
    url,
    status,
    attempt,
    error,
    timestamp: new Date().toISOString(),
  });
}
