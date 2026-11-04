import { Search, BookmarkPlus, History, MonitorSmartphone } from "lucide-react";

export default function FeaturesSection() {
    const features = [
        {
            icon: <Search className="w-8 h-8 text-[#e60023]" />,
            title: "Tra cứu dễ dàng",
            description: "Tìm kiếm sách, tài liệu theo tên, tác giả hoặc thể loại một cách nhanh chóng và chính xác."
        },
        {
            icon: <BookmarkPlus className="w-8 h-8 text-[#e60023]" />,
            title: "Mượn sách trực tuyến",
            description: "Kiểm tra tình trạng sách và đặt mượn trước ngay tại nhà, không cần đến tận nơi."
        },
        {
            icon: <History className="w-8 h-8 text-[#e60023]" />,
            title: "Quản lý lịch sử",
            description: "Theo dõi danh sách các cuốn sách đã mượn, đang mượn và hạn trả để không bị trễ hạn."
        },
        {
            icon: <MonitorSmartphone className="w-8 h-8 text-[#e60023]" />,
            title: "Thư viện minh bạch",
            description: "Kiểm soát mọi hoạt động của thư viện từ mượn sách đến bổ sung sách."
        }
    ];

    return (
        <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Tính năng nổi bật
                    </h2>
                    <p className="text-gray-600 mx-auto">
                        Hệ thống cung cấp các công cụ tiện lợi giúp bạn trải nghiệm thư viện số một cách trọn vẹn nhất.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
