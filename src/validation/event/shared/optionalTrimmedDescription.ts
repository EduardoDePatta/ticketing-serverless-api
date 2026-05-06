import { z } from "zod";
export const optionalTrimmedDescription = z
    .string()
    .optional()
    .transform((v) => {
    if (v === undefined) {
        return undefined;
    }
    const t = v.trim();
    return t === "" ? undefined : t;
});
