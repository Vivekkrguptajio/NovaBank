package com.novabank.controller;

import com.novabank.dto.AuthDtos.*;
import com.novabank.dto.CommonDtos.MessageResponse;
import com.novabank.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public UserResponse me(Authentication auth) {
        return userService.me(auth.getName());
    }

    @PutMapping
    public UserResponse update(Authentication auth, @Valid @RequestBody UpdateProfileRequest req) {
        return userService.updateProfile(auth.getName(), req);
    }

    @PutMapping("/password")
    public MessageResponse changePassword(Authentication auth, @Valid @RequestBody ChangePasswordRequest req) {
        userService.changePassword(auth.getName(), req);
        return new MessageResponse("Password changed");
    }

    @PutMapping("/pin")
    public MessageResponse changePin(Authentication auth, @Valid @RequestBody ChangePinRequest req) {
        userService.changePin(auth.getName(), req);
        return new MessageResponse("Transaction PIN changed");
    }
}
