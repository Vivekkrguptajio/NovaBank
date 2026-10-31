package com.novabank.service;

import com.novabank.dto.LoanDtos.*;
import com.novabank.entity.Account;
import com.novabank.entity.Enums.LoanStatus;
import com.novabank.entity.Enums.LoanType;
import com.novabank.entity.Enums.TransactionMode;
import com.novabank.entity.Enums.TransactionType;
import com.novabank.entity.Loan;
import com.novabank.entity.User;
import com.novabank.exception.ApiException;
import com.novabank.repository.LoanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class LoanService {

    /** EMI may be at most 50% of monthly income. */
    public static final BigDecimal MAX_EMI_TO_INCOME = new BigDecimal("0.50");

    private final LoanRepository loans;
    private final AccountService accountService;
    private final UserService userService;
    private final LedgerService ledger;

    public LoanService(LoanRepository loans, AccountService accountService, UserService userService, LedgerService ledger) {
        this.loans = loans;
        this.accountService = accountService;
        this.userService = userService;
        this.ledger = ledger;
    }

    /**
     * Standard reducing-balance EMI:  EMI = P * r * (1+r)^n / ((1+r)^n - 1),  r = annual rate / 12 / 100
     */
    public static BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRate, int months) {
        if (months <= 0) throw new IllegalArgumentException("months must be > 0");
        double p = principal.doubleValue();
        double r = annualRate.doubleValue() / 12 / 100;
        if (r == 0) return principal.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
        double f = Math.pow(1 + r, months);
        return BigDecimal.valueOf(p * r * f / (f - 1)).setScale(2, RoundingMode.HALF_UP);
    }

    public EmiResponse emiPreview(BigDecimal amount, BigDecimal annualRate, int months) {
        if (amount == null || amount.signum() <= 0 || annualRate == null || annualRate.signum() < 0 || months <= 0) {
            throw ApiException.badRequest("INVALID_INPUT", "amount, rate and tenure must be positive");
        }
        BigDecimal emi = calculateEmi(amount, annualRate, months);
        BigDecimal total = emi.multiply(BigDecimal.valueOf(months));
        return new EmiResponse(amount, annualRate, months, emi, total.subtract(amount), total);
    }

    @Transactional
    public LoanResponse apply(String email, LoanApplyRequest req) {
        User user = userService.getByEmail(email);
        LoanType type = req.type();
        if (req.amount().compareTo(type.getMaxAmount()) > 0) {
            throw ApiException.badRequest("AMOUNT_TOO_HIGH", type + " loan maximum is ₹" + type.getMaxAmount());
        }
        Account creditTo = accountService.getOwned(user, req.creditAccountNo());
        AccountService.requireActive(creditTo);

        BigDecimal emi = calculateEmi(req.amount(), type.getAnnualRate(), req.tenureMonths());
        if (emi.compareTo(req.monthlyIncome().multiply(MAX_EMI_TO_INCOME)) > 0) {
            throw ApiException.unprocessable("NOT_ELIGIBLE",
                    "EMI ₹" + emi + " exceeds 50% of monthly income. Reduce amount or increase tenure.");
        }
        Loan loan = new Loan(user, creditTo, type, req.amount(), req.tenureMonths(), emi, req.monthlyIncome(), req.purpose());
        return LoanResponse.from(loans.save(loan));
    }

    @Transactional(readOnly = true)
    public List<LoanResponse> myLoans(String email) {
        User user = userService.getByEmail(email);
        return loans.findByUserIdOrderByAppliedAtDesc(user.getId()).stream().map(LoanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ScheduleResponse schedule(String email, Long loanId) {
        User user = userService.getByEmail(email);
        Loan l = loans.findById(loanId).orElseThrow(() -> ApiException.notFound("Loan"));
        if (!l.getUser().getId().equals(user.getId()) && !UserService.isAdmin(user)) {
            throw ApiException.forbidden("NOT_LOAN_OWNER", "This loan does not belong to you");
        }
        BigDecimal monthlyRate = l.getAnnualRate().divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);
        BigDecimal balance = l.getAmount();
        List<ScheduleRow> rows = new ArrayList<>();
        for (int m = 1; m <= l.getTenureMonths(); m++) {
            BigDecimal interest = balance.multiply(monthlyRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal principal = l.getEmi().subtract(interest);
            if (m == l.getTenureMonths() || principal.compareTo(balance) > 0) principal = balance; // last row clears rounding
            balance = balance.subtract(principal);
            rows.add(new ScheduleRow(m, principal.add(interest), principal, interest, balance));
        }
        return new ScheduleResponse(l.getId(), emiPreview(l.getAmount(), l.getAnnualRate(), l.getTenureMonths()), rows);
    }

    // ---------- admin ----------

    @Transactional(readOnly = true)
    public List<LoanResponse> byStatus(LoanStatus status) {
        var list = status == null ? loans.findAllByOrderByAppliedAtDesc() : loans.findByStatusOrderByAppliedAtAsc(status);
        return list.stream().map(LoanResponse::from).toList();
    }

    /** Approve = mark APPROVED and credit the loan amount into the customer's chosen account. */
    @Transactional
    public LoanResponse approve(Long loanId) {
        Loan l = pending(loanId);
        Account target = l.getCreditAccount();
        AccountService.requireActive(target);
        ledger.credit(target, l.getAmount(), TransactionType.LOAN_CREDIT, TransactionMode.SYSTEM,
                "Loan disbursal #" + l.getId(), LedgerService.newReference("LON"));
        l.setStatus(LoanStatus.APPROVED);
        l.setDecidedAt(LocalDateTime.now());
        return LoanResponse.from(loans.save(l));
    }

    @Transactional
    public LoanResponse reject(Long loanId, String reason) {
        Loan l = pending(loanId);
        l.setStatus(LoanStatus.REJECTED);
        l.setRejectionReason(reason);
        l.setDecidedAt(LocalDateTime.now());
        return LoanResponse.from(loans.save(l));
    }

    private Loan pending(Long id) {
        Loan l = loans.findById(id).orElseThrow(() -> ApiException.notFound("Loan"));
        if (l.getStatus() != LoanStatus.PENDING) {
            throw ApiException.conflict("ALREADY_DECIDED", "Loan is already " + l.getStatus());
        }
        return l;
    }
}
