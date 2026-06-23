import { z } from 'zod';

/** Return query data is intentionally non-authoritative in SRY-010. */
export const paymentReturnParamsSchema = z.object({}).strict();
