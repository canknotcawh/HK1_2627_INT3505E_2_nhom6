package com.soa.gr6.lms.service;

import com.soa.gr6.lms.dto.CategoryResponse;

import java.util.List;
import java.util.UUID;

public interface CategoryService {
    List<CategoryResponse> list();

    CategoryResponse create(String name);

    CategoryResponse rename(UUID id, String name);

    void delete(UUID id);

    CategoryResponse merge(UUID sourceId, UUID targetId);
}
