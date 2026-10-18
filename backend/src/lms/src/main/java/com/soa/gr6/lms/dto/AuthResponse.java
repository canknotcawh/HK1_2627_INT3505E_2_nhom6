package com.soa.gr6.lms.dto;

public record AuthResponse(String accessToken, String refreshToken, UserResponse user) {
}
