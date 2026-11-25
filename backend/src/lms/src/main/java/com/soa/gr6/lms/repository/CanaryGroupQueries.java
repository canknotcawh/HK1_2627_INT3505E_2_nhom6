package com.soa.gr6.lms.repository;

/**
 * Mảnh JPQL dùng chung cho trang nhóm canary và câu đếm số nhóm.
 *
 * <p>Bộ lọc chỉ được định nghĩa một lần ở đây: nếu sửa điều kiện tìm kiếm mà quên câu đếm thì
 * số trang sẽ lệch với danh sách, nên hai query buộc phải dùng cùng một chuỗi điều kiện.</p>
 */
final class CanaryGroupQueries {

    private CanaryGroupQueries() {
    }

    /** Lọc theo một sách (nếu có) và chuỗi tìm trên mã token, email, họ tên, tên sách. */
    static final String WHERE = """
            where (:bookId is null or t.book.id = :bookId)
              and (:q = ''
                   or lower(t.tokenPrefix) like lower(concat('%', :q, '%'))
                   or lower(t.user.email) like lower(concat('%', :q, '%'))
                   or lower(t.user.fullName) like lower(concat('%', :q, '%'))
                   or lower(t.book.title) like lower(concat('%', :q, '%')))
            """;

    /** Một nhóm = một cặp (sách, người đọc); thứ tự cố định để phân trang ổn định. */
    static final String GROUP_BY = """
            group by t.book.id, t.book.title, t.user.id, t.user.email, t.user.fullName
            order by max(t.lastSeenAt) desc, max(t.issuedAt) desc
            """;

    /**
     * Đếm số nhóm bằng cách đếm chuỗi "bookId:userId" khác nhau, vì JPQL không có
     * count(distinct a, b) và cũng không cho subquery trong FROM.
     */
    static final String COUNT = "select count(distinct concat(concat(cast(t.book.id as string), ':'), "
            + "cast(t.user.id as string))) from CanaryToken t\n" + WHERE;
}
