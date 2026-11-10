import { useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { isStrongPassword } from "@/lib/password-policy";

export default function PasswordReset() {
    const [params] = useSearchParams();
    const token = params.get("token");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (token && !isStrongPassword(password)) {
            setError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
            return;
        }
        setSubmitting(true);
        setMessage("");
        setError("");
        try {
            if (token) {
                await apiClient.post("/api/v1/public/auth/password-reset/confirm", { token, newPassword: password });
                setMessage("Mật khẩu đã được đổi. Bạn có thể đăng nhập lại.");
            } else {
                await apiClient.post("/api/v1/public/auth/password-reset/request", { email });
                setMessage("Nếu email đủ điều kiện, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư.");
            }
        } catch (submitError) {
            const code = isAxiosError<{ code?: string }>(submitError) ? submitError.response?.data?.code : undefined;
            setError(code === "UNAUTHORIZED"
                ? "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới."
                : "Không thể xử lý yêu cầu. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <ThemeToggle floating />
            <section className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">{token ? "Đặt mật khẩu mới" : "Quên mật khẩu"}</h1>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                    {token ? "Chọn mật khẩu mới có ít nhất 8 ký tự." : "Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu."}
                </p>
                <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                    {token ? (
                        <>
                            <input type="password" minLength={8} maxLength={100} required value={password}
                                onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu mới"
                                className="h-11 rounded-xl border border-gray-200 px-4 text-sm" />
                            <PasswordRequirements value={password} />
                        </>
                    ) : (
                        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)}
                            placeholder="Email" className="h-11 rounded-xl border border-gray-200 px-4 text-sm" />
                    )}
                    <Button type="submit" disabled={submitting || (!!token && !isStrongPassword(password))}>
                        {submitting ? "Đang xử lý…" : token ? "Đổi mật khẩu" : "Gửi hướng dẫn"}
                    </Button>
                </form>
                {message && <p className="mt-4 text-sm text-green-700" role="status">{message}</p>}
                {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
                <Link to="/login" className="mt-6 inline-block text-sm font-medium text-[#e60023] hover:underline">Quay lại đăng nhập</Link>
            </section>
        </main>
    );
}
