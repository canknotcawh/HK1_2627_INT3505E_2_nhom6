package com.soa.gr6.lms.exception;

import java.util.UUID;

public class CategoryNotFoundException extends DomainException {
    public CategoryNotFoundException(UUID categoryId) {
        super("CATEGORY_NOT_FOUND", "Category not found: " + categoryId);
    }
}
