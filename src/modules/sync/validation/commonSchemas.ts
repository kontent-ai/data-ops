import { z } from "zod";

export const CodenameReferenceSchema = z.strictObject({ codename: z.string() });
