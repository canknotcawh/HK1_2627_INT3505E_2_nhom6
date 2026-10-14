package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.service.BookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class BookSearchIntegrationTest {

    @Autowired
    private BookService bookService;

    @Autowired
    private BookRepository bookRepository;

    @BeforeEach
    void setUp() {
        // Create test books with Vietnamese titles
        Book book1 = new Book("Lập trình Java và Spring Boot nâng cao");
        book1.updateMetadata(
                "9780000000001",
                "Lập trình Java và Spring Boot nâng cao",
                "Hướng dẫn chi tiết từ cơ bản đến nâng cao",
                "Cuốn sách hướng dẫn lập trình Java cho người mới bắt đầu",
                "vi",
                2024,
                450,
                null
        );
        book1.updateCopyCounts(5, 5);

        Book book2 = new Book("Giải tích và Đại số tuyến tính");
        book2.updateMetadata(
                "9780000000002",
                "Giải tích và Đại số tuyến tính",
                "Toán học cao cấp",
                "Giáo trình toán cho sinh viên ngành công nghệ thông tin",
                "vi",
                2023,
                300,
                null
        );
        book2.updateCopyCounts(3, 3);

        Book book3 = new Book("Machine Learning with Python");
        book3.updateMetadata(
                "9780000000003",
                "Machine Learning with Python",
                "Practical guide",
                "Learn machine learning algorithms using Python libraries",
                "en",
                2022,
                520,
                null
        );
        book3.updateCopyCounts(2, 0); // Out of copies

        bookRepository.save(book1);
        bookRepository.save(book2);
        bookRepository.save(book3);
    }

    @Test
    void testPrefixMatchingWhileTyping() {
        // User is typing prefix "lap tr"
        Page<BookResponse> result = bookService.searchBooks("lap tr", null, null, PageRequest.of(0, 10));
        assertFalse(result.isEmpty());
        assertTrue(result.getContent().stream().anyMatch(b -> b.title().contains("Lập trình")));
    }

    @Test
    void testUnaccentedVietnameseSearch() {
        // User types without accents: "giai tich"
        Page<BookResponse> result = bookService.searchBooks("giai tich", null, null, PageRequest.of(0, 10));
        assertFalse(result.isEmpty());
        assertTrue(result.getContent().stream().anyMatch(b -> b.title().contains("Giải tích")));

        // User types with accents: "giải tích"
        Page<BookResponse> resultAccented = bookService.searchBooks("giải tích", null, null, PageRequest.of(0, 10));
        assertFalse(resultAccented.isEmpty());
        assertTrue(resultAccented.getContent().stream().anyMatch(b -> b.title().contains("Giải tích")));
    }

    @Test
    void testTypoToleranceWithPgTrgm() {
        // User types with a typo: "pythn" instead of "python"
        Page<BookResponse> result = bookService.searchBooks("pythn", null, null, PageRequest.of(0, 10));
        assertFalse(result.isEmpty());
        assertTrue(result.getContent().stream().anyMatch(b -> b.title().contains("Python")));
    }

    @Test
    void testAvailabilityFilter() {
        // Filter only available books
        Page<BookResponse> available = bookService.searchBooks(null, null, "available", PageRequest.of(0, 10));
        assertTrue(available.getContent().stream().allMatch(b -> b.availableCopies() > 0));

        // Filter unavailable books
        Page<BookResponse> unavailable = bookService.searchBooks(null, null, "unavailable", PageRequest.of(0, 10));
        assertTrue(unavailable.getContent().stream().allMatch(b -> b.availableCopies() == 0));
    }
}
