import { ClipboardCheck, MousePointerClick, Search } from "lucide-react";

const STEPS = [
    {
        icon: Search,
        title: "Tìm cuốn bạn muốn",
        text: "Gõ tên sách, tác giả hoặc chọn thể loại. Mỗi cuốn đều cho biết còn bao nhiêu bản.",
    },
    {
        icon: MousePointerClick,
        title: "Mượn trực tuyến",
        text: "Đăng nhập và bấm “Mượn ngay”. Bạn có 14 ngày để đọc, và được gia hạn thêm 1 lần.",
    },
    {
        icon: ClipboardCheck,
        title: "Trả sách gọn nhẹ",
        text: "Gửi yêu cầu trả ngay trong lịch sử mượn, thủ thư sẽ xác nhận khi nhận lại sách.",
    },
];

export default function StepsSection() {
    return (
        <section className="container mx-auto px-4 py-16 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Mượn sách trong 3 bước</h2>
                <p className="mt-2 text-gray-500">Không cần xếp hàng, không cần giấy tờ.</p>
            </div>

            <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
                <div aria-hidden="true" className="absolute left-[16%] right-[16%] top-8 hidden border-t-2 border-dashed border-gray-200 md:block" />
                {STEPS.map(({ icon: Icon, title, text }, index) => (
                    <li key={title} className="relative text-center">
                        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#e60023] shadow-lg shadow-gray-900/10 ring-1 ring-gray-100">
                            <Icon className="h-7 w-7" aria-hidden="true" />
                            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#e60023] text-xs font-bold text-white">
                                {index + 1}
                            </span>
                        </span>
                        <h3 className="mt-5 text-lg font-bold text-gray-900">{title}</h3>
                        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-gray-500">{text}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
