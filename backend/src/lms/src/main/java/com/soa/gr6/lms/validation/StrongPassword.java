package com.soa.gr6.lms.validation;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.ElementType.RECORD_COMPONENT;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/** Validates a password that is being set. Null passes; combine with {@code @NotBlank} to require a value. */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({FIELD, PARAMETER, RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {
    String message() default "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
