package com.soa.gr6.lms.dto.identity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(  @NotBlank(message = "name cannot be blank")
                                @Size(max = 100, message = "name cannot exceed 100 characters")
                                String fullName,

                                @NotBlank(message = "email cannot be blank")
                                @Email(message = "email is not valid")
                                @Size(max = 255, message = "email cannot exceed 255 characters")
                                String email,

                                @NotBlank(message = "password cannot be blank")
                                @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
                                message = "password must be between 8 and 72 characters, containing both letters and numbers")
                                String password) {
    
}
