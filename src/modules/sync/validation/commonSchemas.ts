import { z } from "zod";

export const CodenameReferenceSchema = z.object({ codename: z.string() });
