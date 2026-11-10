import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

type OtpInputProps = {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
    invalid?: boolean;
};

export default function OtpInput({
    value,
    onChange,
    length = 6,
    disabled = false,
    autoFocus = false,
    invalid = false,
}: OtpInputProps) {
    const refs = useRef<Array<HTMLInputElement | null>>([]);
    const digits = Array.from({ length }, (_, index) => value[index] ?? "");

    const focusAt = (index: number) => {
        const target = refs.current[Math.min(Math.max(index, 0), length - 1)];
        target?.focus();
        target?.select();
    };

    const setDigitAt = (index: number, digit: string) => {
        const next = digits.slice();
        next[index] = digit;
        onChange(next.join("").slice(0, length));
    };

    const handleChange = (index: number, raw: string) => {
        const cleaned = raw.replace(/\D/g, "");
        if (!cleaned) {
            setDigitAt(index, "");
            return;
        }
        if (cleaned.length > 1) {
            const merged = (value.slice(0, index) + cleaned).slice(0, length);
            onChange(merged);
            focusAt(Math.min(merged.length, length - 1));
            return;
        }
        setDigitAt(index, cleaned);
        if (index < length - 1) focusAt(index + 1);
    };

    const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Backspace") {
            event.preventDefault();
            if (digits[index]) {
                setDigitAt(index, "");
            } else if (index > 0) {
                setDigitAt(index - 1, "");
                focusAt(index - 1);
            }
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            focusAt(index - 1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            focusAt(index + 1);
        }
    };

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
        const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!pasted) return;
        event.preventDefault();
        onChange(pasted);
        focusAt(Math.min(pasted.length, length - 1));
    };

    return (
        <div className="flex justify-center gap-2" role="group" aria-label={`Mã OTP gồm ${length} chữ số`}>
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(element) => { refs.current[index] = element; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={length}
                    autoFocus={autoFocus && index === 0}
                    disabled={disabled}
                    value={digit}
                    aria-label={`Chữ số ${index + 1}`}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={handlePaste}
                    onFocus={(event) => event.target.select()}
                    className={`h-14 w-11 rounded-xl border-2 text-center text-2xl font-bold outline-none transition-colors sm:w-12
                        ${invalid ? "border-red-400" : digit ? "border-[#e60023] text-[#e60023]" : "border-gray-200 text-gray-900"}
                        focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/20 disabled:bg-gray-50`}
                />
            ))}
        </div>
    );
}
