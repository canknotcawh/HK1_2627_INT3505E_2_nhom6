import { LoaderCircle, Mail, Shield, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Profile() {
    const { user, initialized } = useAuth();

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
                        <p className="mt-1 text-sm text-gray-500">Thông tin tài khoản thư viện của bạn, đồng bộ từ Google.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-5 p-6 md:p-8">
                {!initialized || !user ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500" role="status">
                        <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải hồ sơ...
                    </div>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-gray-700">
                            Họ và tên
                            <div className={fieldClass}>{user.fullName}</div>
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
                            <div className={fieldClass}>{user.email}</div>
                            <span className="mt-1 block text-xs font-normal text-gray-500">
                                Họ tên và email được đồng bộ từ tài khoản Google của bạn.
                            </span>
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Vai trò</span>
                            <div className={fieldClass}>{user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</div>
                        </label>
                    </>
                )}
            </div>
        </section>
    );
}
