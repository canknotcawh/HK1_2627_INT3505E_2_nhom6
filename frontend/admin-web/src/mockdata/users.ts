export type UserRole = "admin" | "user"

export type UserStatus = "active" | "inactive"

export type UserResponse = {
    id: string
    fullname: string
    email: string
    role: UserRole
    status: UserStatus
    createdAt: string
}

export const mockUsers: UserResponse[] = [
    { id: "u01", fullname: "Nguyễn Văn An", email: "nguyen.van.an@gmail.com", role: "admin", status: "active", createdAt: "2024-02-12T09:15:00" },
    { id: "u02", fullname: "Trần Thị Bình", email: "tran.thi.binh@gmail.com", role: "user", status: "active", createdAt: "2024-03-05T14:40:00" },
    { id: "u03", fullname: "Lê Hoàng Cường", email: "le.hoang.cuong@gmail.com", role: "user", status: "active", createdAt: "2024-04-21T08:05:00" },
    { id: "u04", fullname: "Phạm Thu Dung", email: "pham.thu.dung@yahoo.com", role: "user", status: "inactive", createdAt: "2024-05-30T16:25:00" },
    { id: "u05", fullname: "Hoàng Minh Đức", email: "hoang.minh.duc@gmail.com", role: "user", status: "active", createdAt: "2024-06-18T11:50:00" },
    { id: "u06", fullname: "Vũ Thị Giang", email: "vu.thi.giang@gmail.com", role: "user", status: "active", createdAt: "2024-07-09T10:30:00" },
    { id: "u07", fullname: "Đặng Quốc Huy", email: "dang.quoc.huy@outlook.com", role: "user", status: "inactive", createdAt: "2024-08-27T13:10:00" },
    { id: "u08", fullname: "Bùi Khánh Linh", email: "bui.khanh.linh@gmail.com", role: "user", status: "active", createdAt: "2024-09-14T15:55:00" },
    { id: "u09", fullname: "Đỗ Trung Kiên", email: "do.trung.kien@gmail.com", role: "user", status: "active", createdAt: "2024-10-02T07:45:00" },
    { id: "u10", fullname: "Ngô Mai Lan", email: "ngo.mai.lan@yahoo.com", role: "user", status: "active", createdAt: "2024-11-19T17:20:00" },
    { id: "u11", fullname: "Dương Thanh Long", email: "duong.thanh.long@gmail.com", role: "user", status: "active", createdAt: "2024-12-08T09:00:00" },
    { id: "u12", fullname: "Lý Thuỳ Mai", email: "ly.thuy.mai@gmail.com", role: "user", status: "inactive", createdAt: "2025-01-23T12:35:00" },
    { id: "u13", fullname: "Trịnh Văn Nam", email: "trinh.van.nam@gmail.com", role: "user", status: "active", createdAt: "2025-02-11T08:50:00" },
    { id: "u14", fullname: "Phan Thị Ngân", email: "phan.thi.ngan@outlook.com", role: "user", status: "inactive", createdAt: "2025-03-06T14:05:00" },
    { id: "u15", fullname: "Võ Đức Phúc", email: "vo.duc.phuc@gmail.com", role: "user", status: "active", createdAt: "2025-04-17T10:20:00" },
    { id: "u16", fullname: "Tạ Thuỳ Quỳnh", email: "ta.thuy.quynh@gmail.com", role: "user", status: "active", createdAt: "2025-05-29T16:45:00" },
    { id: "u17", fullname: "Chu Văn Sơn", email: "chu.van.son@yahoo.com", role: "user", status: "inactive", createdAt: "2025-06-13T07:30:00" },
    { id: "u18", fullname: "Tô Ngọc Thanh", email: "to.ngoc.thanh@gmail.com", role: "user", status: "active", createdAt: "2025-07-08T13:55:00" },
    { id: "u19", fullname: "Hà Đức Thắng", email: "ha.duc.thang@library.vn", role: "admin", status: "active", createdAt: "2025-08-21T09:25:00" },
    { id: "u20", fullname: "Lê Khánh Trang", email: "le.khanh.trang@gmail.com", role: "user", status: "inactive", createdAt: "2025-09-04T15:10:00" },
    { id: "u21", fullname: "Đỗ Anh Tuấn", email: "do.anh.tuan@outlook.com", role: "user", status: "active", createdAt: "2025-10-16T11:40:00" },
    { id: "u22", fullname: "Nguyễn Thị Vân", email: "nguyen.thi.van@gmail.com", role: "user", status: "active", createdAt: "2025-11-27T08:15:00" },
    { id: "u23", fullname: "Trương Hữu Việt", email: "truong.huu.viet@yahoo.com", role: "user", status: "inactive", createdAt: "2025-12-09T14:30:00" },
    { id: "u24", fullname: "Cao Thị Yến", email: "cao.thi.yen@gmail.com", role: "user", status: "active", createdAt: "2026-01-20T10:05:00" },
    { id: "u25", fullname: "Lý Văn Khoa", email: "ly.van.khoa@gmail.com", role: "user", status: "active", createdAt: "2026-02-12T16:50:00" },
    { id: "u26", fullname: "Đặng Thu Hà", email: "dang.thu.ha@outlook.com", role: "user", status: "inactive", createdAt: "2026-03-18T09:35:00" },
    { id: "u27", fullname: "Phạm Quốc Bảo", email: "pham.quoc.bao@gmail.com", role: "user", status: "active", createdAt: "2026-04-25T12:20:00" },
    { id: "u28", fullname: "Vũ Ngọc Châu", email: "vu.ngoc.chau@gmail.com", role: "user", status: "inactive", createdAt: "2026-05-14T15:45:00" },
    { id: "u29", fullname: "Huỳnh Thị Diễm", email: "huynh.thi.diem@yahoo.com", role: "user", status: "active", createdAt: "2026-06-30T08:55:00" },
    { id: "u30", fullname: "Trần Văn Hiếu", email: "tran.van.hieu@library.vn", role: "admin", status: "active", createdAt: "2026-08-19T13:10:00" },
]
