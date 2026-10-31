package com.novabank.service;

import com.novabank.dto.AccountDtos.*;
import com.novabank.dto.TransactionDtos.TransactionResponse;
import com.novabank.entity.Account;
import com.novabank.entity.Enums.AccountStatus;
import com.novabank.entity.Enums.AccountType;
import com.novabank.entity.Enums.TransactionMode;
import com.novabank.entity.Enums.TransactionType;
import com.novabank.entity.User;
import com.novabank.exception.ApiException;
import com.novabank.repository.AccountRepository;
import com.novabank.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AccountService {

    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final LedgerService ledger;
    private final UserService userService;

    public AccountService(AccountRepository accounts, TransactionRepository transactions,
                          LedgerService ledger, UserService userService) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.ledger = ledger;
        this.userService = userService;
    }

    // ---------- lookups used by other services ----------

    /** Account must exist AND belong to the user (admins can see any account). */
    @Transactional(readOnly = true)
    public Account getOwned(User user, String accountNo) {
        Account a = accounts.findById(normalize(accountNo)).orElseThrow(() -> ApiException.notFound("Account"));
        if (!a.getUser().getId().equals(user.getId()) && !UserService.isAdmin(user)) {
            throw ApiException.forbidden("NOT_ACCOUNT_OWNER", "This account does not belong to you");
        }
        if (a.getStatus() == AccountStatus.CLOSED) throw ApiException.notFound("Account");
        return a;
    }

    public static void requireActive(Account a) {
        if (a.getStatus() != AccountStatus.ACTIVE) {
            throw ApiException.unprocessable("ACCOUNT_NOT_ACTIVE", "Account " + a.getAccountNo() + " is " + a.getStatus());
        }
    }

    // ---------- APIs ----------

    @Transactional
    public AccountResponse create(String email, CreateAccountRequest req) {
        User user = userService.getByEmail(email);
        return AccountResponse.from(openAccount(user, req.type(), req.initialDeposit(), req.fundFromAccountNo(), req.nominee()));
    }

    /** Shared by registration and "open new account". */
    @Transactional
    public Account openAccount(User user, AccountType type, BigDecimal initialDeposit, String fundFrom, String nominee) {
        if (initialDeposit.compareTo(type.getMinimumBalance()) < 0) {
            throw ApiException.badRequest("MIN_OPENING_DEPOSIT",
                    "Minimum opening deposit for " + type + " is ₹" + type.getMinimumBalance());
        }
        Account source = null;
        if (fundFrom != null && !fundFrom.isBlank()) {
            source = getOwned(user, fundFrom);
            requireActive(source);
            if (source.getBalance().subtract(initialDeposit).compareTo(source.getType().getMinimumBalance()) < 0) {
                throw ApiException.unprocessable("INSUFFICIENT_BALANCE", "Not enough balance in " + source.getAccountNo());
            }
        }
        Account account = accounts.save(new Account(generateAccountNo(), user, type, nominee));
        String ref = LedgerService.newReference("OPN");
        if (source != null) {
            ledger.debit(source, initialDeposit, TransactionType.TRANSFER_OUT, TransactionMode.INTERNAL,
                    "Funding new account " + account.getAccountNo(), ref);
            ledger.credit(account, initialDeposit, TransactionType.TRANSFER_IN, TransactionMode.INTERNAL,
                    "Account opening deposit", ref);
        } else {
            ledger.credit(account, initialDeposit, TransactionType.DEPOSIT, TransactionMode.ONLINE,
                    "Account opening deposit", ref);
        }
        return account;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> myAccounts(String email) {
        User user = userService.getByEmail(email);
        return accounts.findByUserIdAndStatusNotOrderByOpenedAtAsc(user.getId(), AccountStatus.CLOSED)
                .stream().map(AccountResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse details(String email, String accountNo) {
        return AccountResponse.from(getOwned(userService.getByEmail(email), accountNo));
    }

    @Transactional(readOnly = true)
    public BalanceResponse balance(String email, String accountNo) {
        Account a = getOwned(userService.getByEmail(email), accountNo);
        BigDecimal onHold = a.getStatus() == AccountStatus.FROZEN ? a.getBalance() : BigDecimal.ZERO;
        BigDecimal available = a.getBalance().subtract(onHold);
        BigDecimal withdrawable = available.subtract(a.getType().getMinimumBalance()).max(BigDecimal.ZERO);
        return new BalanceResponse(a.getAccountNo(), a.getType(), a.getBalance(), available, withdrawable,
                a.getStatus(), LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public MiniStatementResponse miniStatement(String email, String accountNo) {
        Account a = getOwned(userService.getByEmail(email), accountNo);
        List<TransactionResponse> last5 = transactions.findTop5ByAccountAccountNoOrderByCreatedAtDescIdDesc(a.getAccountNo())
                .stream().map(TransactionResponse::from).toList();
        return new MiniStatementResponse(a.getAccountNo(), a.getBalance(), last5);
    }

    /** Beneficiary name check before a transfer. Shows only safe, public info. */
    @Transactional(readOnly = true)
    public BeneficiaryResponse lookup(String accountNo) {
        Account a = accounts.findById(normalize(accountNo))
                .filter(x -> x.getStatus() != AccountStatus.CLOSED)
                .orElseThrow(() -> ApiException.notFound("Account"));
        return new BeneficiaryResponse(a.getAccountNo(), a.getUser().getName(), a.getType(), a.getBranch(),
                a.getStatus() == AccountStatus.ACTIVE);
    }

    /** Freeze / unfreeze. Closing is a separate DELETE call. */
    @Transactional
    public AccountResponse updateStatus(String email, String accountNo, AccountStatus newStatus) {
        if (newStatus == AccountStatus.CLOSED) {
            throw ApiException.badRequest("USE_DELETE", "Use DELETE /api/accounts/{no} to close an account");
        }
        Account a = getOwned(userService.getByEmail(email), accountNo);
        a.setStatus(newStatus);
        return AccountResponse.from(accounts.save(a));
    }

    @Transactional
    public void close(String email, String accountNo) {
        Account a = getOwned(userService.getByEmail(email), accountNo);
        if (a.getBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw ApiException.badRequest("BALANCE_NOT_ZERO",
                    "Withdraw or transfer the remaining ₹" + a.getBalance() + " before closing");
        }
        a.setStatus(AccountStatus.CLOSED);
        accounts.save(a);
    }

    // ---------- helpers ----------

    /** NB1 + 7 random digits, e.g. NB10023451 */
    private String generateAccountNo() {
        String no;
        do {
            no = "NB1" + ThreadLocalRandom.current().nextInt(1_000_000, 10_000_000);
        } while (accounts.existsById(no));
        return no;
    }

    static String normalize(String accountNo) {
        return accountNo == null ? "" : accountNo.trim().toUpperCase();
    }
}
