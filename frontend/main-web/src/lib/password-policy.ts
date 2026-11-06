// Must stay in sync with PasswordPolicy.java; the backend is the authority, this only gives early feedback.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export type PasswordRule = { id: string; label: string; test: (value: string) => boolean };

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: "length", label: `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự`, test: (v) => Array.from(v).length >= PASSWORD_MIN_LENGTH },
  { id: "digit", label: "Có chữ số", test: (v) => /\p{Nd}/u.test(v) },
  { id: "lower", label: "Có chữ thường", test: (v) => /\p{Ll}/u.test(v) },
  { id: "upper", label: "Có chữ in hoa", test: (v) => /\p{Lu}/u.test(v) },
  { id: "special", label: "Có ký tự đặc biệt (không phải chữ, số hay khoảng trắng)", test: (v) => /[^\p{L}\p{Nd}\s]/u.test(v) },
];

export function isPasswordTooLong(value: string): boolean {
  return new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES;
}

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value)) && !isPasswordTooLong(value);
}
