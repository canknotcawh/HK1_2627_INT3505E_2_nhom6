package com.soa.gr6.lms.service;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static com.soa.gr6.lms.service.PreviewService.Action.*;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "LMS_IT", matches = "true")
class PreviewDatabaseTest {
    @Autowired PreviewService service;
    @Autowired JdbcTemplate db;

    @Test
    void sharesLeasesMergesGuestBudgetAndHonorsCurrentLoan() {
        UUID book = UUID.randomUUID(), guest = UUID.randomUUID(), user = UUID.randomUUID();
        UUID first = UUID.randomUUID(), second = UUID.randomUUID();
        db.update("""
            insert into book (id,title,status,total_copies,available_copies,created_at,updated_at)
            values (?,'Preview test','ACTIVE',1,1,now(),now())
            """, book);
        db.update("insert into app_user(id,email,full_name) values (?,?,?)", user, user+"@example.test", "Reader");
        assertEquals(180000, service.access(book,null,guest,first,STATUS).remainingMs());
        service.access(book,null,guest,first,READ);
        service.access(book,null,guest,second,READ);
        service.access(book,null,guest,first,PAUSE);
        assertEquals(1, db.queryForObject("select count(*) from preview_tab where book_id=?", Integer.class, book));
        // Simulate the final second elapsing, without a wall-clock sleep.
        db.update("update preview_budget set remaining_ms=1000, accounted_at=1000 where book_id=?", book);
        db.update("update preview_tab set valid_until=2000 where book_id=?", book);
        service.claim(user,guest);
        assertEquals("locked", service.access(book,user,null,second,STATUS).state());
        db.update("""
            insert into loan(id,user_id,book_id,status,borrowed_at,due_at,renewed_count)
            values (?,?,?,'ACTIVE',now(),now()+interval '1 day',0)
            """, UUID.randomUUID(),user,book);
        assertEquals("borrowed", service.access(book,user,null,second,READ).state());
        db.update("update loan set due_at=now()-interval '1 second' where book_id=?", book);
        assertEquals("locked", service.access(book,user,null,second,READ).state());
    }
}
