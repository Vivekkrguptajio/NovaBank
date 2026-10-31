package com.novabank.controller;

import com.novabank.dto.AccountDtos.*;
import com.novabank.dto.CommonDtos.MessageResponse;
import com.novabank.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(Authentication auth, @Valid @RequestBody CreateAccountRequest req) {
        return accountService.create(auth.getName(), req);
    }

    @GetMapping("/my")
    public List<AccountResponse> myAccounts(Authentication auth) {
        return accountService.myAccounts(auth.getName());
    }

    /** Beneficiary name check for transfers. Declared before /{no} so it is not treated as an account number. */
    @GetMapping("/lookup/{accountNo}")
    public BeneficiaryResponse lookup(@PathVariable("accountNo") String accountNo) {
        return accountService.lookup(accountNo);
    }

    @GetMapping("/{accountNo}")
    public AccountResponse details(Authentication auth, @PathVariable("accountNo") String accountNo) {
        return accountService.details(auth.getName(), accountNo);
    }

    @GetMapping("/{accountNo}/balance")
    public BalanceResponse balance(Authentication auth, @PathVariable("accountNo") String accountNo) {
        return accountService.balance(auth.getName(), accountNo);
    }

    @GetMapping("/{accountNo}/mini-statement")
    public MiniStatementResponse miniStatement(Authentication auth, @PathVariable("accountNo") String accountNo) {
        return accountService.miniStatement(auth.getName(), accountNo);
    }

    @PutMapping("/{accountNo}/status")
    public AccountResponse updateStatus(Authentication auth, @PathVariable("accountNo") String accountNo,
                                        @Valid @RequestBody UpdateStatusRequest req) {
        return accountService.updateStatus(auth.getName(), accountNo, req.status());
    }

    @DeleteMapping("/{accountNo}")
    public MessageResponse close(Authentication auth, @PathVariable("accountNo") String accountNo) {
        accountService.close(auth.getName(), accountNo);
        return new MessageResponse("Account " + accountNo + " closed");
    }
}
