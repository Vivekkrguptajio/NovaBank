package com.novabank.service;

import com.novabank.dto.AuthDtos.*;
import com.novabank.entity.Enums.Role;
import com.novabank.entity.User;
import com.novabank.exception.ApiException;
import com.novabank.repository.UserRepository;
import com.novabank.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthenticationManager authManager;
    private final AccountService accountService;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt,
                       AuthenticationManager authManager, AccountService accountService) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.authManager = authManager;
        this.accountService = accountService;
    }

    /** Creates the customer AND their first account in one transaction. */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("EMAIL_EXISTS", "Email is already registered");
        }
        User u = new User(req.name().trim(), req.email().trim().toLowerCase(), encoder.encode(req.password()),
                req.phone(), Role.CUSTOMER);
        u.setCity(req.city());
        u.setPinHash(encoder.encode(req.transactionPin()));
        users.save(u);
        accountService.openAccount(u, req.accountType(), req.initialDeposit(), null, null);
        return tokenFor(u);
    }

    /** Throws BadCredentialsException (-> 401) if email/password is wrong. */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(req.email().trim(), req.password()));
        User u = users.findByEmailIgnoreCase(req.email().trim()).orElseThrow(() -> ApiException.notFound("User"));
        return tokenFor(u);
    }

    private AuthResponse tokenFor(User u) {
        String token = jwt.generateToken(u.getEmail(), u.getRole().name());
        return new AuthResponse(token, "Bearer", jwt.getExpirationMs(), UserResponse.from(u));
    }
}
