import { MAX_PAGE_SIZE } from "@mosaic/contracts/backend/mail";

export const clampPageSize = (limit: number) => Math.min(MAX_PAGE_SIZE, Math.max(1, limit));
