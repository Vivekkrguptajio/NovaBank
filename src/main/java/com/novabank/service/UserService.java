package com.novabank.service;

import com.novabank.dto.AuthDtos.*;
import com.novabank.entity.Enums.Role;
import com.novabank.entity.User;
import com.novabank.exception.ApiException;
import com.novabank.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    /** Controllers pass authentication.getName() (the email from the JWT). */
    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> ApiException.notFound("User"));
    }

    public static boolean isAdmin(User u) {
        return u.getRole() == Role.ADMIN;
    }

    @Transactional(readOnly = true)
    public UserResponse me(String email) {
        return UserResponse.from(getByEmail(email));
    }

    @Transactional
    public UserResponse updateProfile(String email, UpdateProfileRequest req) {
        User u = getByEmail(email);
        u.setName(req.name().trim());
        if (req.phone() != null) u.setPhone(req.phone());
        if (req.city() != null) u.setCity(req.city());
        return UserResponse.from(users.save(u));
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest req) {
        User u = getByEmail(email);
        requirePassword(u, req.currentPassword());
        u.setPasswordHash(encoder.encode(req.newPassword()));
        users.save(u);
    }

    @Transactional
    public void changePin(String email, ChangePinRequest req) {
        User u = getByEmail(email);
        requirePassword(u, req.currentPassword());
        u.setPinHash(encoder.encode(req.newPin()));
        users.save(u);
    }

    /** Used by money transfer. Wrong PIN -> 403. */
    public void verifyPin(User u, String pin) {
        if (u.getPinHash() == null || !encoder.matches(pin, u.getPinHash())) {
            throw ApiException.forbidden("INVALID_PIN", "Incorrect transaction PIN");
        }
    }

    private void requirePassword(User u, String raw) {
        if (!encoder.matches(raw, u.getPasswordHash())) {
            throw ApiException.badRequest("WRONG_PASSWORD", "Current password is incorrect");
        }
    }
}
