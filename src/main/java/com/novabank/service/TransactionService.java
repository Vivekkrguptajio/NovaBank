package com.novabank.service;

import com.novabank.dto.CommonDtos.PageResponse;
import com.novabank.dto.TransactionDtos.*;
import com.novabank.entity.Account;
import com.novabank.entity.Enums.AccountStatus;
import com.novabank.entity.Enums.TransactionMode;
import com.novabank.entity.Enums.TransactionType;
import com.novabank.entity.Transaction;
import com.novabank.entity.User;
import com.novabank.exception.ApiException;
import com.novabank.repository.AccountRepository;
import com.novabank.repository.TransactionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TransactionService {

    public static final BigDecimal DAILY_WITHDRAW_LIMIT = new BigDecimal("50000");
    public static final BigDecimal UPI_MAX = new BigDecimal("100000");
    public static final BigDecimal IMPS_MAX = new BigDecimal("500000");
    public static final BigDecimal RTGS_MIN = new BigDecimal("200000");

    private final AccountRepository accountRepo;
    private final TransactionRepository txnRepo;
    private final AccountService accountService;
    private final UserService userService;
    private final LedgerService ledger;

    public TransactionService(AccountRepository accountRepo, TransactionRepository txnRepo,
                              AccountService accountService, UserService userService, LedgerService ledger) {
        this.accountRepo = accountRepo;
        this.txnRepo = txnRepo;
        this.accountService = accountService;
        this.userService = userService;
        this.ledger = ledger;
    }

    @Transactional
    public TransactionResponse deposit(String email, DepositWithdrawRequest req) {
        Account a = accountService.getOwned(userService.getByEmail(email), req.accountNo());
        AccountService.requireActive(a);
        TransactionMode mode = req.mode() != null ? req.mode() : TransactionMode.CASH;
        Transaction t = ledger.credit(a, req.amount(), TransactionType.DEPOSIT, mode,
                blankTo(req.remark(), "Deposit"), LedgerService.newReference("DEP"));
        return TransactionResponse.from(t);
    }

    @Transactional
    public TransactionResponse withdraw(String email, DepositWithdrawRequest req) {
        Account a = accountService.getOwned(userService.getByEmail(email), req.accountNo());
        AccountService.requireActive(a);
        checkMinimumBalance(a, req.amount());

        BigDecimal usedToday = orZero(txnRepo.sumSince(a.getAccountNo(), TransactionType.WITHDRAW, LocalDate.now().atStartOfDay()));
        if (usedToday.add(req.amount()).compareTo(DAILY_WITHDRAW_LIMIT) > 0) {
            throw ApiException.unprocessable("DAILY_LIMIT_EXCEEDED",
                    "Daily withdrawal limit is ₹" + DAILY_WITHDRAW_LIMIT + ". Remaining today: ₹" + DAILY_WITHDRAW_LIMIT.subtract(usedToday));
        }
        TransactionMode mode = req.mode() != null ? req.mode() : TransactionMode.CASH;
        Transaction t = ledger.debit(a, req.amount(), TransactionType.WITHDRAW, mode,
                blankTo(req.remark(), "Withdrawal"), LedgerService.newReference("WDL"));
        return TransactionResponse.from(t);
    }

    /**
     * Money transfer. @Transactional = the debit and the credit either BOTH happen or NEITHER happens.
     */
    @Transactional
    public TransferResponse transfer(String email, TransferRequest req) {
        User user = userService.getByEmail(email);
        Account from = accountService.getOwned(user, req.fromAccountNo());
        String toNo = AccountService.normalize(req.toAccountNo());

        if (from.getAccountNo().equals(toNo)) {
            throw ApiException.badRequest("SAME_ACCOUNT", "Source and destination account cannot be the same");
        }
        Account to = accountRepo.findById(toNo)
                .filter(a -> a.getStatus() != AccountStatus.CLOSED)
                .orElseThrow(() -> ApiException.notFound("Beneficiary account"));

        AccountService.requireActive(from);
        if (to.getStatus() != AccountStatus.ACTIVE) {
            throw ApiException.unprocessable("BENEFICIARY_NOT_ACTIVE", "Beneficiary account is " + to.getStatus());
        }
        checkModeLimits(req.mode(), req.amount());
        userService.verifyPin(user, req.pin());
        checkMinimumBalance(from, req.amount());

        String ref = LedgerService.newReference("TRF");
        String remark = blankTo(req.remark(), null);
        Transaction out = ledger.debit(from, req.amount(), TransactionType.TRANSFER_OUT, req.mode(),
                remark != null ? remark : "To " + to.getUser().getName(), ref);
        ledger.credit(to, req.amount(), TransactionType.TRANSFER_IN, req.mode(),
                "From " + user.getName() + (remark != null ? " - " + remark : ""), ref);

        return new TransferResponse(ref, from.getAccountNo(), to.getAccountNo(), to.getUser().getName(),
                req.amount(), req.mode(), out.getBalanceAfter(), out.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> history(String email, String accountNo, TransactionType type,
                                                     LocalDate from, LocalDate to, String q, int page, int size) {
        List<String> accountNos = accountsInScope(email, accountNo);
        if (accountNos.isEmpty()) return new PageResponse<>(List.of(), page, size, 0, 0);
        var result = txnRepo.search(accountNos, type,
                from != null ? from.atStartOfDay() : null,
                to != null ? to.plusDays(1).atStartOfDay() : null,
                q == null ? "" : q.trim(),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return PageResponse.of(result.map(TransactionResponse::from));
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> recent(String email) {
        List<String> nos = accountsInScope(email, null);
        if (nos.isEmpty()) return List.of();
        return txnRepo.findTop5ByAccountAccountNoInOrderByCreatedAtDescIdDesc(nos)
                .stream().map(TransactionResponse::from).toList();
    }

    /** CSV statement with the same filters as history (max 5000 rows). */
    @Transactional(readOnly = true)
    public String exportCsv(String email, String accountNo, TransactionType type, LocalDate from, LocalDate to, String q) {
        var page = history(email, accountNo, type, from, to, q, 0, 100);
        StringBuilder sb = new StringBuilder("Reference,Date,Account,Type,Mode,Description,Amount,BalanceAfter\n");
        int p = 0;
        while (true) {
            for (TransactionResponse t : page.content()) {
                sb.append(t.referenceId()).append(',').append(t.createdAt()).append(',').append(t.accountNo()).append(',')
                        .append(t.type()).append(',').append(t.mode()).append(',')
                        .append('"').append(t.description() == null ? "" : t.description().replace("\"", "\"\"")).append('"').append(',')
                        .append(t.credit() ? "" : "-").append(t.amount()).append(',').append(t.balanceAfter()).append('\n');
            }
            if (++p >= page.totalPages() || p >= 50) break;
            page = history(email, accountNo, type, from, to, q, p, 100);
        }
        return sb.toString();
    }

    // ---------- rules ----------

    private static void checkMinimumBalance(Account a, BigDecimal amount) {
        BigDecimal after = a.getBalance().subtract(amount);
        if (after.compareTo(a.getType().getMinimumBalance()) < 0) {
            throw ApiException.unprocessable("INSUFFICIENT_BALANCE",
                    "Insufficient balance. You must keep a minimum balance of ₹" + a.getType().getMinimumBalance());
        }
    }

    static void checkModeLimits(TransactionMode mode, BigDecimal amount) {
        switch (mode) {
            case UPI -> { if (amount.compareTo(UPI_MAX) > 0) throw limit("UPI limit is ₹1,00,000"); }
            case IMPS -> { if (amount.compareTo(IMPS_MAX) > 0) throw limit("IMPS limit is ₹5,00,000"); }
            case RTGS -> { if (amount.compareTo(RTGS_MIN) < 0) throw limit("RTGS requires a minimum of ₹2,00,000"); }
            case NEFT, INTERNAL -> { /* no limit */ }
            default -> throw ApiException.badRequest("INVALID_MODE", "Transfer mode must be UPI, IMPS, NEFT or RTGS");
        }
    }

    private static ApiException limit(String msg) {
        return ApiException.unprocessable("TRANSFER_LIMIT", msg);
    }

    /** One account (if given and owned) or all of the user's accounts. */
    private List<String> accountsInScope(String email, String accountNo) {
        User user = userService.getByEmail(email);
        if (accountNo != null && !accountNo.isBlank()) {
            return List.of(accountService.getOwned(user, accountNo).getAccountNo());
        }
        return accountRepo.findByUserIdAndStatusNotOrderByOpenedAtAsc(user.getId(), AccountStatus.CLOSED)
                .stream().map(Account::getAccountNo).toList();
    }

    static BigDecimal orZero(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static String blankTo(String s, String fallback) {
        return s == null || s.isBlank() ? fallback : s.trim();
    }
}
