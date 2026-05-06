/**
 * Luhn (mod 10) check for credit card numbers (digits-only string).
 * Returns true when the checksum is valid.
 */
export function isLuhnValid(digits: string): boolean {
    if (!/^\d+$/.test(digits)) {
        return false;
    }
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let n = digits.charCodeAt(i) - 48;
        if (shouldDouble) {
            n *= 2;
            if (n > 9) {
                n -= 9;
            }
        }
        sum += n;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}

export function normalizeCardNumber(raw: string): string {
    return raw.replace(/[\s-]/g, "");
}
