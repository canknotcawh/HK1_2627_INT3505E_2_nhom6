package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.dto.CategoryMergeRequest;
import com.soa.gr6.lms.dto.CategoryRequest;
import com.soa.gr6.lms.dto.CategoryResponse;
import com.soa.gr6.lms.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/categories")
public class AdminCategoryController {
    private final CategoryService categoryService;

    public AdminCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@Valid @RequestBody CategoryRequest request) {
        return categoryService.create(request.name());
    }

    @PutMapping("/{id}")
    public CategoryResponse rename(@PathVariable UUID id, @Valid @RequestBody CategoryRequest request) {
        return categoryService.rename(id, request.name());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        categoryService.delete(id);
    }

    @PostMapping("/{id}/merge")
    public CategoryResponse merge(@PathVariable UUID id, @Valid @RequestBody CategoryMergeRequest request) {
        return categoryService.merge(id, request.targetId());
    }
}
