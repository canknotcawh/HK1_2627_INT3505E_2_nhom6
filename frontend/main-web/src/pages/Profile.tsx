import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { LoaderCircle, Mail, Shield, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function Profile() {
    const { user, initialized, updateProfile, changePassword, logout } = useAuth();
    const [fullName, setFullName] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => setFullName(user?.fullName ?? ""), [user?.fullName]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");
        try {
            await updateProfile(fullName.trim());
            setMessage("Đã cập nhật họ và tên.");
        } catch {
            setError("Không thể cập nhật hồ sơ. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setChangingPassword(true);
        setPasswordMessage("");
        setPasswordError("");
        try {
            await changePassword(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setPasswordMessage("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
            logout();
        } catch (changeError) {
            const code = (changeError as { response?: { data?: { code?: string } } })?.response?.data?.code;
            setPasswordError(code === "GOOGLE_ACCOUNT_ONLY"
                ? "Tài khoản này đăng nhập bằng Google và chưa có mật khẩu riêng."
                : "Không đổi được mật khẩu. Kiểm tra mật khẩu hiện tại hoặc thử lại sau.");
        } finally {
            setChangingPassword(false);
        }
    };

    const fieldClass = "mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700";

    return (
        <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-rose-50 to-white px-6 py-7 md:px-8">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e60023] text-white">
                        <UserRound className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
                        <p className="mt-1 text-sm text-gray-500">Quản lý thông tin tài khoản thư viện của bạn.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-5 p-6 md:p-8">
                {!initialized || !user ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500" role="status">
                        <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải hồ sơ...
                    </div>
                ) : (
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <label className="block text-sm font-medium text-gray-700">
                            Họ và tên
                            <input className={fieldClass} value={fullName} maxLength={255} required
                                onChange={(event) => setFullName(event.target.value)} />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
                            <div className={fieldClass}>{user.email}</div>
                            <span className="mt-1 block text-xs font-normal text-gray-500">Email đăng nhập chưa thể thay đổi tại đây.</span>
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Vai trò</span>
                            <div className={fieldClass}>{user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</div>
                        </label>
                        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
                        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                        <Button type="submit" disabled={saving || !fullName.trim()}>
                            {saving ? "Đang lưu…" : "Lưu thay đổi"}
                        </Button>
                    </form>
                )}
            </div>
            {initialized && user && (
                <div className="border-t border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg font-semibold text-gray-900">Đổi mật khẩu</h2>
                    <p className="mt-1 text-sm text-gray-500">Tài khoản đăng nhập bằng Google không cần đổi mật khẩu tại đây.</p>
                    <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handlePasswordSubmit}>
                        <input type="password" autoComplete="current-password" required value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Mật khẩu hiện tại"
                            className="h-11 rounded-xl border border-gray-200 px-4 text-sm" />
                        <input type="password" autoComplete="new-password" minLength={8} maxLength={100} required value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                            className="h-11 rounded-xl border border-gray-200 px-4 text-sm" />
                        <div className="sm:col-span-2 flex flex-col items-start gap-3">
                            {passwordMessage && <p role="status" className="text-sm text-green-700">{passwordMessage}</p>}
                            {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
                            <Button type="submit" disabled={changingPassword}>
                                {changingPassword ? "Đang cập nhật…" : "Đổi mật khẩu"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
