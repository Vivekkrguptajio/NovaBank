package com.novabank.controller;

import com.novabank.dto.AccountDtos.AccountResponse;
import com.novabank.dto.AccountDtos.UpdateStatusRequest;
import com.novabank.dto.CommonDtos.*;
import com.novabank.dto.LoanDtos.LoanResponse;
import com.novabank.dto.LoanDtos.RejectRequest;
import com.novabank.dto.TransactionDtos.TransactionResponse;
import com.novabank.entity.Enums.LoanStatus;
import com.novabank.service.AdminService;
import com.novabank.service.LoanService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Everything under /api/admin requires ROLE_ADMIN (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final LoanService loanService;

    public AdminController(AdminService adminService, LoanService loanService) {
        this.adminService = adminService;
        this.loanService = loanService;
    }

    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public List<CustomerSummary> customers() {
        return adminService.customers();
    }

    @GetMapping("/accounts")
    public List<AccountResponse> accounts() {
        return adminService.allAccounts();
    }

    @PutMapping("/accounts/{accountNo}/status")
    public AccountResponse setStatus(@PathVariable("accountNo") String accountNo, @Valid @RequestBody UpdateStatusRequest req) {
        return adminService.setAccountStatus(accountNo, req.status());
    }

    @GetMapping("/transactions")
    public PageResponse<TransactionResponse> transactions(@RequestParam(name = "page", defaultValue = "0") int page,
                                                          @RequestParam(name = "size", defaultValue = "20") int size) {
        return adminService.allTransactions(page, size);
    }

    /** GET /api/admin/loans?status=PENDING  (omit status for all loans) */
    @GetMapping("/loans")
    public List<LoanResponse> loans(@RequestParam(name = "status", required = false) LoanStatus status) {
        return loanService.byStatus(status);
    }

    @PutMapping("/loans/{id}/approve")
    public LoanResponse approve(@PathVariable("id") Long id) {
        return loanService.approve(id);
    }

    @PutMapping("/loans/{id}/reject")
    public LoanResponse reject(@PathVariable("id") Long id, @Valid @RequestBody RejectRequest req) {
        return loanService.reject(id, req.reason());
    }
}
