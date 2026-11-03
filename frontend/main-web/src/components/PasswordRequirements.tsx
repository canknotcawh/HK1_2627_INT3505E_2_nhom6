import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES, isPasswordTooLong } from "../lib/password-policy";

export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="space-y-1 text-xs" aria-label="Yêu cầu mật khẩu">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 ${met ? "text-emerald-700" : "text-neutral-500"}`}>
            {met ? <Check className="size-3.5" aria-label="Đạt" /> : <Circle className="size-3.5" aria-label="Chưa đạt" />}
            {rule.label}
          </li>
        );
      })}
      {isPasswordTooLong(value) && <li className="text-red-700">Mật khẩu quá dài (tối đa 72 byte)</li>}
    </ul>
  );
}
