export default function StatsSection() {
    // Tính năng nổi bật
    const stats = [
        {
            value: "Số j đó",
            label: "Đầu sách đa dạng",
        },
        {
            value: "Số j đó",
            label: "Độc giả tích cực",
        },
        {
            value: "Số j đó",
            label: "Thể loại sách",
        },
        {
            value: "24/7",
            label: "Truy cập hệ thống",
        }
    ];

    return (
        <section className="py-16 bg-white border-y border-gray-100">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x md:divide-gray-100">
                    {stats.map((stat, index) => (
                        <div key={index} className="flex flex-col items-center justify-center p-4">
                            <h3 className="text-4xl md:text-5xl font-extrabold text-[#e60023] mb-2 font-serif">
                                {stat.value}
                            </h3>
                            <p className="text-gray-600 font-medium text-lg">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
