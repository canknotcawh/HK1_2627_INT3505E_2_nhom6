package com.soa.gr6.lms.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record AdminStatsResponse(
        long totalUsers,
        long totalAdmins,
        long activeBooks,
        long totalCopies,
        long availableCopies,
        Map<String, Long> loansByStatus,
        List<DailyLoans> loansPerDay,
        List<NamedCount> topCategories,
        List<NamedCount> topBooks) {

    public record DailyLoans(LocalDate date, long borrowed, long returned) {
    }

    public record NamedCount(String name, long count) {
    }
}
