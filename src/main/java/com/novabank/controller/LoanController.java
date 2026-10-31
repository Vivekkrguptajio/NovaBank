package com.novabank.controller;

import com.novabank.dto.LoanDtos.*;
import com.novabank.service.LoanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    /** Public: GET /api/loans/emi-calculator?amount=500000&rate=11.5&tenure=36 */
    @GetMapping("/emi-calculator")
    public EmiResponse emi(@RequestParam(name = "amount") BigDecimal amount, @RequestParam(name = "rate") BigDecimal rate, @RequestParam(name = "tenure") int tenure) {
        return loanService.emiPreview(amount, rate, tenure);
    }

    @PostMapping("/apply")
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse apply(Authentication auth, @Valid @RequestBody LoanApplyRequest req) {
        return loanService.apply(auth.getName(), req);
    }

    @GetMapping("/my")
    public List<LoanResponse> myLoans(Authentication auth) {
        return loanService.myLoans(auth.getName());
    }

    @GetMapping("/{id}/schedule")
    public ScheduleResponse schedule(Authentication auth, @PathVariable("id") Long id) {
        return loanService.schedule(auth.getName(), id);
    }
}
