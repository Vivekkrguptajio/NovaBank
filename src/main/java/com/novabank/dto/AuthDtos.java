package com.novabank.dto;

import com.novabank.entity.Enums.AccountType;
import com.novabank.entity.Enums.Role;
import com.novabank.entity.User;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "[0-9+ ]{10,15}", message = "must be a valid phone number") String phone,
            @NotBlank @Size(min = 6, max = 64) String password,
            @NotBlank @Pattern(regexp = "\\d{4}", message = "must be exactly 4 digits") String transactionPin,
            @NotNull AccountType accountType,
            @NotNull @Positive BigDecimal initialDeposit,
            String city) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record AuthResponse(String token, String tokenType, long expiresInMs, UserResponse user) {}

    public record UserResponse(Long id, String name, String email, String phone, String city, Role role,
                               LocalDateTime joinedAt) {
        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getCity(), u.getRole(),
                    u.getCreatedAt());
        }
    }

    public record UpdateProfileRequest(@NotBlank @Size(max = 100) String name,
                                       @Pattern(regexp = "[0-9+ ]{10,15}") String phone,
                                       @Size(max = 60) String city) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 6, max = 64) String newPassword) {}

    public record ChangePinRequest(@NotBlank String currentPassword,
                                   @NotBlank @Pattern(regexp = "\\d{4}", message = "must be exactly 4 digits") String newPin) {}
}
