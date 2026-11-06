package com.soa.gr6.lms.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {
    private static final String TOO_LONG = "Mật khẩu quá dài (tối đa 72 byte)";

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        var broken = PasswordPolicy.violations(value);
        if (broken.isEmpty()) {
            return true;
        }
        if (broken.size() == 1 && broken.contains(PasswordPolicy.Rule.MAX_BYTES)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(TOO_LONG).addConstraintViolation();
        }
        return false;
    }
}
