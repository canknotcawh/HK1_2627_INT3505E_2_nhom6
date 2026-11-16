package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.dto.AdminStatsResponse;
import com.soa.gr6.lms.service.AdminStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/stats")
public class AdminStatsController {
    private final AdminStatsService statsService;

    public AdminStatsController(AdminStatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/overview")
    public AdminStatsResponse overview() {
        return statsService.overview();
    }
}
