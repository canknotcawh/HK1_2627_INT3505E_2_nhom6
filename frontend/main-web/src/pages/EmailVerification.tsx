import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type VerificationLocationState = {
    email?: string;
    resendIn?: number;
    deliveryFailed?: boolean;
    verified?: boolean;
};

function verificationErrorMessage(error: unknown): string {
    if (!isAxiosError<{ code?: string }>(error)) {
        return "Không thể xác minh lúc này. Vui lòng thử lại.";
    }
    if (!error.response) {
        return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
    }
    if (error.response.data?.code === "EMAIL_VERIFICATION_INVALID") {
        return "Mã hoặc liên kết không hợp lệ, đã hết hạn hoặc đã được sử dụng. Hãy gửi email mới.";
    }
    if (error.response.data?.code === "VALIDATION_FAILED") {
        return "Thông tin chưa đúng định dạng. Hãy kiểm tra email và mã gồm 6 chữ số.";
    }
    return "Có lỗi khi xử lý yêu cầu. Vui lòng thử lại.";
}

export default function EmailVerification() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const routeState = (location.state as VerificationLocationState | null) ?? null;
    const [email, setEmail] = useState(routeState?.email ?? "");
    const [code, setCode] = useState("");
    const [useOtp, setUseOtp] = useState(!token);
    const [verified, setVerified] = useState(routeState?.verified ?? false);
    const [error, setError] = useState(routeState?.deliveryFailed
        ? "Tài khoản đã được tạo nhưng email chưa gửi được. Hãy yêu cầu gửi lại email xác minh."
        : "");
    const [notice, setNotice] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendIn, setResendIn] = useState(routeState?.resendIn ?? 0);

    useEffect(() => {
        if (resendIn <= 0) return;
        const timer = window.setTimeout(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => window.clearTimeout(timer);
    }, [resendIn]);

    const finishVerification = () => {
        setVerified(true);
        setError("");
        setNotice("");
        navigate("/verify-email", { replace: true, state: { email, verified: true } });
    };

    const confirm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        setNotice("");
        try {
            if (token && !useOtp) {
                await apiClient.post("/api/v1/public/auth/email-verification/confirm", { token });
            } else {
                await apiClient.post("/api/v1/public/auth/email-verification/confirm", { email, code });
            }
            finishVerification();
        } catch (submitError) {
            setError(verificationErrorMessage(submitError));
        } finally {
            setSubmitting(false);
        }
    };

    const resend = async () => {
        if (!email.trim()) {
            setError("Nhập email đã đăng ký để gửi lại hướng dẫn xác minh.");
            return;
        }
        setResending(true);
        setError("");
        setNotice("");
        try {
            await apiClient.post("/api/v1/public/auth/email-verification/resend", { email });
            setNotice("Yêu cầu được xử lý nếu tài khoản đủ điều kiện. Kiểm tra hộp thư và thư mục spam; nếu chưa nhận được, hãy thử gửi lại sau 60 giây.");
            setResendIn(60);
        } catch (resendError) {
            setError(verificationErrorMessage(resendError));
        } finally {
            setResending(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <section className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e60023] text-white">
                    {verified ? <CheckCircle2 className="h-7 w-7" /> : <MailCheck className="h-7 w-7" />}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {verified ? "Email đã được xác minh" : "Xác minh email của bạn"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                    {verified
                        ? "Tài khoản đã sẵn sàng. Đăng nhập bằng email và mật khẩu bạn vừa đăng ký."
                        : "Nhập mã 6 chữ số trong email hoặc xác nhận bằng liên kết gửi tới hộp thư của bạn."}
                </p>
                {!verified && <p className="mt-2 text-xs text-gray-500">
                    Trong môi trường local, thư thử nghiệm có tại{" "}
                    <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="font-medium text-[#e60023] hover:underline">
                        Mailpit
                    </a>.
                </p>}

                {verified ? (
                    <Link to="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#e60023] px-4 py-3 text-sm font-semibold text-white hover:bg-[#c9001f]">
                        Đi tới đăng nhập
                    </Link>
                ) : (
                    <>
                        {token && !useOtp ? (
                            <form onSubmit={confirm} className="mt-6 flex flex-col gap-3">
                                <Button type="submit" variant="brand" disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {submitting ? "Đang xác minh..." : "Xác minh bằng liên kết"}
                                </Button>
                                <button type="button" onClick={() => { setUseOtp(true); setError(""); }}
                                    className="text-sm font-medium text-[#e60023] hover:underline">
                                    Nhập mã OTP thay thế
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={confirm} className="mt-6 flex flex-col gap-3">
                                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                                    Email đăng ký
                                    <input type="email" required maxLength={255} autoComplete="email" value={email}
                                        onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"
                                        className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-normal outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/20" />
                                </label>
                                <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                                    Mã OTP
                                    <input type="text" required inputMode="numeric" autoComplete="one-time-code"
                                        pattern="[0-9]{6}" minLength={6} maxLength={6} value={code}
                                        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                        placeholder="000000"
                                        className="h-12 rounded-xl border border-gray-200 px-4 text-center text-lg tracking-[0.4em] outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/20" />
                                </label>
                                <Button type="submit" variant="brand" disabled={submitting || code.length !== 6}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {submitting ? "Đang xác minh..." : "Xác minh email"}
                                </Button>
                                {token && <button type="button" onClick={() => { setUseOtp(false); setError(""); }}
                                    className="text-sm font-medium text-[#e60023] hover:underline">Dùng liên kết xác minh</button>}
                            </form>
                        )}

                        <div className="mt-6 border-t border-gray-100 pt-5">
                            {token && !useOtp && <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                                Email đăng ký để gửi lại
                                <input type="email" required maxLength={255} autoComplete="email" value={email}
                                    onChange={(event) => setEmail(event.target.value)} placeholder="Email đăng ký"
                                    className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-normal outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/20" />
                            </label>}
                            <Button type="button" variant="outline" className="mt-3 w-full"
                                disabled={resending || resendIn > 0} onClick={resend}>
                                {resending ? "Đang gửi..." : resendIn > 0 ? `Gửi lại sau ${resendIn} giây` : "Gửi lại email"}
                            </Button>
                        </div>
                    </>
                )}

                {notice && <p className="mt-4 text-sm text-green-700" role="status">{notice}</p>}
                {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
                {!verified && <Link to="/login" className="mt-6 inline-block text-sm font-medium text-[#e60023] hover:underline">Quay lại đăng nhập</Link>}
            </section>
        </main>
    );
}
