import type { ZodError } from "zod";

export function zodErrorToFieldErrors(params: {
    error: ZodError;
}): Record<string, string> {
    const { error } = params;
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
        if (fields[key] === undefined) {
            fields[key] = issue.message;
        }
    }
    return fields;
}
