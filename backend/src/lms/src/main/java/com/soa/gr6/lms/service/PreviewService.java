package com.soa.gr6.lms.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PreviewService {
    static final int BUDGET = 180_000;
    static final int LEASE = 5_000;

    public enum Action { STATUS, READ, PAUSE }
    public record Access(String state, int remainingMs, int validMs) {}
    private record Budget(int remaining, long accountedAt) {}

    private final JdbcTemplate db;

    public PreviewService(JdbcTemplate db) {
        this.db = db;
    }

    @Transactional
    public void claim(UUID user, UUID guest) {
        if (guest == null) return;
        for (UUID book : db.queryForList(
                "select book_id from preview_budget where reader=? order by book_id", UUID.class, "guest:" + guest)) {
            access(book, user, guest, null, Action.STATUS);
        }
    }

    @Transactional
    public Access access(UUID book, UUID user, UUID guest, UUID tab, Action action) {
        if (!Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from book where id=?)",
                Boolean.class, book))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        String reader = user == null ? "guest:" + guest : "user:" + user;
        // Lock guest first in every merge, then the account. Concurrent tabs share one budget.
        String guestReader = "guest:" + guest;
        Budget anonymous = user != null && guest != null ? lock(guestReader, book) : null;
        Budget budget = lock(reader, book);
        long now = System.currentTimeMillis();
        int remaining = settle(reader, book, budget, now);
        if (anonymous != null) {
            int guestRemaining = settle(guestReader, book, anonymous, now);
            save(guestReader, book, guestRemaining, now);
            remaining = Math.min(remaining, guestRemaining);
        }
        Instant due = user == null ? null : db.queryForObject("""
                select max(due_at) from loan where book_id=? and user_id=?
                and status in ('ACTIVE','PENDING_RETURN') and returned_at is null
                """, (rs, n) -> rs.getTimestamp(1) == null ? null : rs.getTimestamp(1).toInstant(), book, user);
        int valid = Math.min(LEASE, remaining);
        boolean borrowed = due != null && due.toEpochMilli() > now;
        if (action == Action.PAUSE || borrowed) {
            db.update("delete from preview_tab where reader=? and book_id=? and tab_id=?", reader, book, tab);
        } else if (action == Action.READ && valid > 0) {
            db.update("""
                    insert into preview_tab values (?,?,?,?) on conflict (reader,book_id,tab_id)
                    do update set valid_until=excluded.valid_until
                    """, reader, book, tab, now + valid);
        }
        save(reader, book, remaining, now);
        if (borrowed) return new Access("borrowed", remaining, (int) Math.min(LEASE, due.toEpochMilli() - now));
        return new Access(remaining == 0 ? "locked" : "preview", remaining, valid);
    }

    private Budget lock(String reader, UUID book) {
        db.update("insert into preview_budget values (?,?,?,0) on conflict do nothing", reader, book, BUDGET);
        return db.queryForObject("""
                select remaining_ms, accounted_at from preview_budget where reader=? and book_id=? for update
                """, (rs, n) -> new Budget(rs.getInt(1), rs.getLong(2)), reader, book);
    }

    private int settle(String reader, UUID book, Budget budget, long now) {
        long until = db.queryForObject("""
                select coalesce(max(valid_until),0) from preview_tab where reader=? and book_id=?
                """, Long.class, reader, book);
        db.update("delete from preview_tab where reader=? and book_id=? and valid_until<=?", reader, book, now);
        return remaining(budget.remaining(), budget.accountedAt(), until, now);
    }

    static int remaining(int prior, long accounted, long lastLeaseEnd, long now) {
        long elapsed = Math.max(0, Math.min(now, lastLeaseEnd) - accounted);
        return (int) Math.max(0, prior - elapsed);
    }

    private void save(String reader, UUID book, int remaining, long now) {
        db.update("update preview_budget set remaining_ms=?, accounted_at=? where reader=? and book_id=?",
                remaining, now, reader, book);
    }
}
