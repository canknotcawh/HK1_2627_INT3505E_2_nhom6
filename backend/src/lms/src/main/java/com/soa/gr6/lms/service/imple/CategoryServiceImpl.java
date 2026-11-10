package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Category;
import com.soa.gr6.lms.dto.CategoryResponse;
import com.soa.gr6.lms.exception.CategoryNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import com.soa.gr6.lms.repository.CategoryRepository;
import com.soa.gr6.lms.service.CategoryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryServiceImpl implements CategoryService {
    private final CategoryRepository categoryRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categoryRepository.findAllWithCounts().stream()
                .map(c -> new CategoryResponse(c.getId(), c.getName(), c.getBookCount()))
                .toList();
    }

    @Override
    @Transactional
    public CategoryResponse create(String name) {
        String clean = name.trim();
        requireNameFree(clean, null);
        Category saved = categoryRepository.save(new Category(clean));
        return new CategoryResponse(saved.getId(), saved.getName(), 0);
    }

    @Override
    @Transactional
    public CategoryResponse rename(UUID id, String name) {
        Category category = find(id);
        String clean = name.trim();
        requireNameFree(clean, id);
        category.rename(clean);
        return new CategoryResponse(id, clean, categoryRepository.countBooks(id));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Category category = find(id);
        if (categoryRepository.countBooks(id) > 0) {
            throw new DuplicateResourceException(
                    "CATEGORY_IN_USE", "category still has books; merge it into another category instead");
        }
        categoryRepository.delete(category);
    }

    @Override
    @Transactional
    public CategoryResponse merge(UUID sourceId, UUID targetId) {
        if (sourceId.equals(targetId)) {
            throw new InvalidDomainStateException("CATEGORY_MERGE_SAME", "cannot merge a category into itself");
        }
        Category source = find(sourceId);
        Category target = find(targetId);
        categoryRepository.copyBooks(sourceId, targetId);
        categoryRepository.flush();
        // book_category rows of the source go away through ON DELETE CASCADE.
        categoryRepository.delete(source);
        categoryRepository.flush();
        return new CategoryResponse(targetId, target.getName(), categoryRepository.countBooks(targetId));
    }

    private Category find(UUID id) {
        return categoryRepository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
    }

    private void requireNameFree(String name, UUID ownId) {
        categoryRepository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(ownId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "CATEGORY_ALREADY_EXISTS", "a category with this name already exists");
                });
    }
}
