import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, UserRound } from "lucide-react";
import keycloak from "@/lib/keycloak";
import { Button } from "@/components/ui/button";

type ProfileForm = {
    firstName: string;
    lastName: string;
    email: string;
};

const emptyProfile: ProfileForm = { firstName: "", lastName: "", email: "" };

export default function Profile() {
    const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            try {
                await keycloak.updateToken(30);
                const response = await fetch(`${keycloak.authServerUrl}/realms/${keycloak.realm}/account`, {
                    headers: { Authorization: `Bearer ${keycloak.token}` },
                });
                if (!response.ok) throw new Error("Không thể tải hồ sơ. Vui lòng thử lại.");

                const account = await response.json() as Partial<ProfileForm> & { username?: string };
                if (!cancelled) {
                    setProfile({
                        firstName: account.firstName ?? "",
                        lastName: account.lastName ?? "",
                        email: account.email ?? "",
                    });
                    setUsername(account.username ?? "");
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Đã xảy ra lỗi khi tải hồ sơ.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadProfile();
        return () => { cancelled = true; };
    }, []);

    function updateField(field: keyof ProfileForm, value: string) {
        setProfile(current => ({ ...current, [field]: value }));
        setMessage("");
        setError("");
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            await keycloak.updateToken(30);
            const response = await fetch(`${keycloak.authServerUrl}/realms/${keycloak.realm}/account`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${keycloak.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(profile),
            });
            if (!response.ok) {
                const detail = await response.text();
                throw new Error(detail || "Không thể lưu hồ sơ. Vui lòng kiểm tra lại thông tin.");
            }
            setMessage("Thông tin hồ sơ đã được cập nhật.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Đã xảy ra lỗi khi lưu hồ sơ.");
        } finally {
            setSaving(false);
        }
    }

    async function handleChangePassword() {
        setChangingPassword(true);
        setError("");
        try {
            await keycloak.updateToken(30);
            const url = await keycloak.createLoginUrl({
                action: "UPDATE_PASSWORD",
                redirectUri: `${window.location.origin}/user/profile`,
            });
            window.location.assign(url);
        } catch (changeError) {
            setError(changeError instanceof Error ? changeError.message : "Không thể mở trang đổi mật khẩu.");
            setChangingPassword(false);
        }
    }

    const inputClass = "mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e60023] focus:ring-4 focus:ring-[#e60023]/10 disabled:bg-gray-50";

    return (
        <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gradient-to-r from-rose-50 to-white px-6 py-7 md:px-8">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e60023] text-white">
                        <UserRound className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
                        <p className="mt-1 text-sm text-gray-500">Cập nhật thông tin tài khoản thư viện của bạn.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6 md:p-8">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500" role="status">
                        <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải hồ sơ...
                    </div>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-gray-700">
                            Tên đăng nhập
                            <input className={inputClass} value={username} disabled readOnly />
                        </label>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Họ
                                <input className={inputClass} value={profile.lastName} onChange={event => updateField("lastName", event.target.value)} autoComplete="family-name" />
                            </label>
                            <label className="block text-sm font-medium text-gray-700">
                                Tên
                                <input className={inputClass} value={profile.firstName} onChange={event => updateField("firstName", event.target.value)} autoComplete="given-name" />
                            </label>
                        </div>
                        <label className="block text-sm font-medium text-gray-700">
                            Email
                            <input className={inputClass} type="email" value={profile.email} onChange={event => updateField("email", event.target.value)} autoComplete="email" required />
                        </label>

                        {message && <p className="flex items-center gap-2 text-sm text-green-700" role="status"><CheckCircle2 className="h-4 w-4" />{message}</p>}
                        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

                        <div className="flex justify-end border-t border-gray-100 pt-5">
                            <Button type="submit" variant="brand" disabled={saving} className="min-w-36 rounded-full">
                                {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                {saving ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </div>
                    </>
                )}
            </form>

            {!loading && (
                <div className="mx-6 mb-6 rounded-xl border border-gray-100 bg-gray-50/70 p-5 md:mx-8 md:mb-8 md:flex md:items-center md:justify-between md:gap-6">
                    <div className="mb-4 md:mb-0">
                        <h2 className="font-semibold text-gray-900">Mật khẩu</h2>
                        <p className="mt-1 text-sm text-gray-500">Đổi mật khẩu an toàn qua trang xác thực của Keycloak.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={handleChangePassword} disabled={changingPassword} className="w-full rounded-full md:w-auto">
                        {changingPassword ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        {changingPassword ? "Đang chuyển..." : "Đổi mật khẩu"}
                    </Button>
                </div>
            )}
        </section>
    );
}
