import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError } from "axios";
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    KeyRound,
    LoaderCircle,
    Lock,
    LogOut,
    Mail,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PASSWORD_RULES, isPasswordTooLong, isStrongPassword } from "@/lib/password-policy";
import { listMyLoans } from "@/lib/loans";
import type { LoanDto } from "@/lib/loans";

type Tab = "info" | "security";

function profileErrorMessage(error: unknown): string {
    if (!isAxiosError<{ code?: string }>(error)) {
        return "Không thể cập nhật hồ sơ. Vui lòng thử lại.";
    }
    if (!error.response) {
        return "Không kết nối được backend. Tên chưa được lưu, hãy thử lại.";
    }
    if (error.response.status === 401) {
        return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử lại.";
    }
    if (error.response.status === 400 && error.response.data?.code === "VALIDATION_FAILED") {
        return "Họ và tên không hợp lệ. Tên không được để trống và tối đa 255 ký tự.";
    }
    if (error.response.status >= 500) {
        return "Máy chủ đang gặp lỗi. Tên chưa được lưu, hãy thử lại sau.";
    }
    return "Không thể cập nhật hồ sơ. Vui lòng thử lại.";
}

function initialsOf(name: string | undefined, email: string | undefined): string {
    const source = (name?.trim() || email?.split("@")[0] || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    const letters = parts.length >= 2
        ? parts[0][0] + parts[parts.length - 1][0]
        : source.slice(0, 2);
    return letters.toUpperCase();
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    autoComplete,
    placeholder,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: string;
    placeholder: string;
}) {
    const [visible, setVisible] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="relative mt-2">
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    autoComplete={autoComplete}
                    required
                    maxLength={100}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-4 pr-11 text-sm text-gray-900 outline-none transition focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/20"
                />
                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-gray-400 hover:text-gray-700"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}

export default function Profile() {
    const { user, initialized, updateProfile, changePassword, logout } = useAuth();
    const [tab, setTab] = useState<Tab>("info");
    const [fullName, setFullName] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [loans, setLoans] = useState<LoanDto[] | null>(null);

    useEffect(() => setFullName(user?.fullName ?? ""), [user?.fullName]);

    useEffect(() => {
        if (!initialized || !user) return;
        let cancelled = false;
        listMyLoans()
            .then((page) => { if (!cancelled) setLoans(page.content); })
            .catch(() => { if (!cancelled) setLoans([]); });
        return () => { cancelled = true; };
    }, [initialized, user]);

    const stats = useMemo(() => {
        const count = (status: LoanDto["status"]) => (loans ?? []).filter((loan) => loan.status === status).length;
        return [
            { icon: BookOpen, label: "Đang mượn", value: count("ACTIVE"), tone: "text-blue-600 bg-blue-100" },
            { icon: Clock, label: "Chờ xác nhận trả", value: count("PENDING_RETURN"), tone: "text-amber-600 bg-amber-100" },
            { icon: CheckCircle2, label: "Đã trả", value: count("RETURNED"), tone: "text-green-700 bg-green-100" },
            { icon: AlertTriangle, label: "Quá hạn", value: count("OVERDUE"), tone: "text-red-600 bg-red-100" },
        ];
    }, [loans]);

    const metRules = PASSWORD_RULES.filter((rule) => rule.test(newPassword)).length;
    const strengthLabel = metRules <= 2 ? "Yếu" : metRules < PASSWORD_RULES.length ? "Trung bình" : "Mạnh";
    const strengthBar = metRules <= 2 ? "bg-red-500" : metRules < PASSWORD_RULES.length ? "bg-amber-400" : "bg-emerald-500";

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedName = fullName.trim();
        if (!normalizedName) {
            setMessage("");
            setError("Họ và tên không được để trống.");
            return;
        }
        if (normalizedName.length > 255) {
            setMessage("");
            setError("Họ và tên tối đa 255 ký tự.");
            return;
        }
        setSaving(true);
        setMessage("");
        setError("");
        try {
            await updateProfile(normalizedName);
            setMessage("Đã cập nhật họ và tên.");
        } catch (submitError) {
            setError(profileErrorMessage(submitError));
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isStrongPassword(newPassword)) {
            setPasswordError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
            return;
        }
        setChangingPassword(true);
        setPasswordMessage("");
        setPasswordError("");
        try {
            await changePassword(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setPasswordMessage("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
            logout({ toLogin: true });
        } catch (changeError) {
            const code = (changeError as { response?: { data?: { code?: string } } })?.response?.data?.code;
            setPasswordError(code === "GOOGLE_ACCOUNT_ONLY"
                ? "Tài khoản này đăng nhập bằng Google và chưa có mật khẩu riêng."
                : "Không đổi được mật khẩu. Kiểm tra mật khẩu hiện tại hoặc thử lại sau.");
        } finally {
            setChangingPassword(false);
        }
    };

    if (!initialized || !user) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải hồ sơ...
            </div>
        );
    }

    const isAdmin = user.role === "ADMIN";
    const nameChanged = fullName.trim() !== user.fullName.trim();
    const readOnlyField = "flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600";
    const tabClass = (active: boolean) =>
        `flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors lg:flex-none lg:justify-start ${
            active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        }`;

    return (
        <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-12">
            {/* Summary */}
            <aside className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-4 lg:sticky lg:top-24">
                <div className="h-20 bg-gradient-to-r from-amber-300/80 via-orange-300/70 to-rose-300/70" aria-hidden="true" />
                <div className="-mt-10 px-6 pb-6 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-2xl font-extrabold text-slate-900 ring-4 ring-white shadow-md">
                        {initialsOf(user.fullName, user.email)}
                    </div>
                    <h1 className="mt-3 break-words text-xl font-bold text-gray-900">{user.fullName}</h1>
                    <p className="mt-0.5 break-all text-sm text-gray-500">{user.email}</p>
                    <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        isAdmin ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                    }`}>
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {isAdmin ? "Quản trị viên" : "Độc giả"}
                    </span>

                    <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                        {stats.map(({ icon: Icon, label, value, tone }) => (
                            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <p className="mt-2 text-xl font-bold text-gray-900">{loans === null ? "–" : value}</p>
                                <p className="text-[11px] leading-4 text-gray-500">{label}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => logout()}
                        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-8">
                <div className="flex gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-xs" role="tablist" aria-label="Mục hồ sơ">
                    <button type="button" role="tab" aria-selected={tab === "info"} onClick={() => setTab("info")} className={tabClass(tab === "info")}>
                        <UserRound className="h-4 w-4" aria-hidden="true" /> Thông tin cá nhân
                    </button>
                    <button type="button" role="tab" aria-selected={tab === "security"} onClick={() => setTab("security")} className={tabClass(tab === "security")}>
                        <KeyRound className="h-4 w-4" aria-hidden="true" /> Mật khẩu & bảo mật
                    </button>
                </div>

                {tab === "info" ? (
                    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8" role="tabpanel">
                        <h2 className="text-lg font-bold text-gray-900">Thông tin cá nhân</h2>
                        <p className="mt-1 text-sm text-gray-500">Tên của bạn hiển thị trong lịch sử mượn và các thông báo của thư viện.</p>

                        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">Họ và tên</label>
                                <input
                                    id="profile-name"
                                    value={fullName}
                                    maxLength={255}
                                    required
                                    aria-invalid={!!error}
                                    aria-describedby={error ? "profile-name-error" : undefined}
                                    onChange={(event) => {
                                        setFullName(event.target.value);
                                        setMessage("");
                                        setError("");
                                    }}
                                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/20"
                                />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <span className="block text-sm font-medium text-gray-700">Email</span>
                                    <div className={`${readOnlyField} mt-2`}>
                                        <Mail className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                                        <span className="truncate">{user.email}</span>
                                        <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden="true" />
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-500">Email đăng nhập chưa thể thay đổi tại đây.</p>
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-gray-700">Vai trò</span>
                                    <div className={`${readOnlyField} mt-2`}>
                                        <ShieldCheck className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                                        <span>{isAdmin ? "Quản trị viên" : "Độc giả"}</span>
                                        <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden="true" />
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-500">Vai trò do quản trị viên cấp.</p>
                                </div>
                            </div>

                            {message && <p role="status" className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">{message}</p>}
                            {error && <p id="profile-name-error" role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
                                <Button
                                    type="submit"
                                    variant="brand"
                                    className="rounded-xl px-6"
                                    disabled={saving || !nameChanged || !fullName.trim() || fullName.trim().length > 255}
                                >
                                    {saving ? "Đang lưu…" : "Lưu thay đổi"}
                                </Button>
                                {nameChanged && (
                                    <button
                                        type="button"
                                        onClick={() => { setFullName(user.fullName); setError(""); setMessage(""); }}
                                        className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-800"
                                    >
                                        Hoàn tác
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>
                ) : (
                    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8" role="tabpanel">
                        <h2 className="text-lg font-bold text-gray-900">Mật khẩu & bảo mật</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Đổi mật khẩu sẽ đăng xuất bạn khỏi mọi thiết bị. Tài khoản đăng nhập bằng Google không cần đổi mật khẩu tại đây.
                        </p>

                        <form className="mt-6 space-y-5" onSubmit={handlePasswordSubmit}>
                            <PasswordField
                                id="current-password"
                                label="Mật khẩu hiện tại"
                                value={currentPassword}
                                onChange={setCurrentPassword}
                                autoComplete="current-password"
                                placeholder="Nhập mật khẩu hiện tại"
                            />
                            <PasswordField
                                id="new-password"
                                label="Mật khẩu mới"
                                value={newPassword}
                                onChange={setNewPassword}
                                autoComplete="new-password"
                                placeholder="Ít nhất 8 ký tự"
                            />

                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-gray-700">Độ mạnh mật khẩu</span>
                                    <span className="font-semibold text-gray-500">{newPassword ? strengthLabel : "—"}</span>
                                </div>
                                <div className="mt-2 flex gap-1" aria-hidden="true">
                                    {PASSWORD_RULES.map((rule, index) => (
                                        <span
                                            key={rule.id}
                                            className={`h-1.5 flex-1 rounded-full ${index < metRules ? strengthBar : "bg-gray-200"}`}
                                        />
                                    ))}
                                </div>
                                <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2" aria-label="Yêu cầu mật khẩu">
                                    {PASSWORD_RULES.map((rule) => {
                                        const met = rule.test(newPassword);
                                        return (
                                            <li key={rule.id} className={`flex items-center gap-1.5 ${met ? "text-green-700" : "text-gray-500"}`}>
                                                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${met ? "" : "text-gray-300"}`} aria-label={met ? "Đạt" : "Chưa đạt"} />
                                                {rule.label}
                                            </li>
                                        );
                                    })}
                                    {isPasswordTooLong(newPassword) && <li className="text-red-600">Mật khẩu quá dài (tối đa 72 byte)</li>}
                                </ul>
                            </div>

                            {passwordMessage && <p role="status" className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">{passwordMessage}</p>}
                            {passwordError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>}

                            <div className="border-t border-gray-100 pt-5">
                                <Button
                                    type="submit"
                                    variant="brand"
                                    className="rounded-xl px-6"
                                    disabled={changingPassword || !currentPassword || !isStrongPassword(newPassword)}
                                >
                                    {changingPassword ? "Đang cập nhật…" : "Đổi mật khẩu"}
                                </Button>
                            </div>
                        </form>
                    </section>
                )}
            </div>
        </div>
    );
}
