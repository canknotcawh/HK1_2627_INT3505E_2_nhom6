package com.soa.gr6.lms.dto;

import java.util.UUID;

public record CategoryResponse(UUID id, String name, long bookCount) {
}
