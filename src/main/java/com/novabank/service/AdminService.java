package com.novabank.service;

import com.novabank.dto.AccountDtos.AccountResponse;
import com.novabank.dto.CommonDtos.*;
import com.novabank.dto.TransactionDtos.TransactionResponse;
import com.novabank.entity.Account;
import com.novabank.entity.Enums.AccountStatus;
import com.novabank.entity.Enums.LoanStatus;
import com.novabank.entity.Enums.Role;
import com.novabank.exception.ApiException;
import com.novabank.repository.AccountRepository;
import com.novabank.repository.LoanRepository;
import com.novabank.repository.TransactionRepository;
import com.novabank.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class AdminService {

    private final UserRepository users;
    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final LoanRepository loans;

    public AdminService(UserRepository users, AccountRepository accounts, TransactionRepository transactions,
                        LoanRepository loans) {
        this.users = users;
        this.accounts = accounts;
        this.transactions = transactions;
        this.loans = loans;
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        return new AdminStatsResponse(
                users.countByRole(Role.CUSTOMER),
                accounts.countByStatusNot(AccountStatus.CLOSED),
                TransactionService.orZero(accounts.sumBalanceExcluding(AccountStatus.CLOSED)),
                loans.countByStatus(LoanStatus.PENDING),
                TransactionService.orZero(loans.sumAmountByStatus(LoanStatus.PENDING)),
                TransactionService.orZero(loans.sumAmountByStatus(LoanStatus.APPROVED)),
                transactions.countByCreatedAtGreaterThanEqual(LocalDate.now().atStartOfDay()));
    }

    @Transactional(readOnly = true)
    public List<CustomerSummary> customers() {
        return users.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER).stream().map(u -> {
            List<Account> accs = accounts.findByUserIdAndStatusNotOrderByOpenedAtAsc(u.getId(), AccountStatus.CLOSED);
            BigDecimal total = accs.stream().map(Account::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
            return new CustomerSummary(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getCity(),
                    u.getCreatedAt(), accs.size(), total, loans.countByUserId(u.getId()));
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> allAccounts() {
        return accounts.findByStatusNotOrderByOpenedAtDesc(AccountStatus.CLOSED).stream().map(AccountResponse::from).toList();
    }

    @Transactional
    public AccountResponse setAccountStatus(String accountNo, AccountStatus status) {
        if (status == AccountStatus.CLOSED) throw ApiException.badRequest("USE_DELETE", "Admins can only freeze/unfreeze");
        Account a = accounts.findById(AccountService.normalize(accountNo)).orElseThrow(() -> ApiException.notFound("Account"));
        a.setStatus(status);
        return AccountResponse.from(accounts.save(a));
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> allTransactions(int page, int size) {
        var p = transactions.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return PageResponse.of(p.map(TransactionResponse::from));
    }
}
