package com.novabank.service;

import com.novabank.dto.TransactionDtos.DepositWithdrawRequest;
import com.novabank.dto.TransactionDtos.TransferRequest;
import com.novabank.entity.Account;
import com.novabank.entity.Enums.*;
import com.novabank.entity.User;
import com.novabank.exception.ApiException;
import com.novabank.repository.AccountRepository;
import com.novabank.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Unit tests for business rules using Mockito (no database). */
@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock AccountRepository accountRepo;
    @Mock TransactionRepository txnRepo;
    @Mock AccountService accountService;
    @Mock UserService userService;
    @Mock LedgerService ledger;
    @InjectMocks TransactionService service;

    private User rahul;
    private Account savings;

    @BeforeEach
    void setUp() {
        rahul = new User("Rahul", "rahul@test.in", "hash", "9999999999", Role.CUSTOMER);
        savings = new Account("NB10000001", rahul, AccountType.SAVINGS, null);
        savings.setBalance(new BigDecimal("5000"));
        lenient().when(userService.getByEmail("rahul@test.in")).thenReturn(rahul);
    }

    @Test
    void withdrawBelowMinimumBalanceIsRejected() {
        when(accountService.getOwned(rahul, "NB10000001")).thenReturn(savings);

        // 5000 - 4500 = 500 < 1000 minimum for SAVINGS
        var req = new DepositWithdrawRequest("NB10000001", new BigDecimal("4500"), TransactionMode.ATM, null);

        assertThatThrownBy(() -> service.withdraw("rahul@test.in", req))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "INSUFFICIENT_BALANCE");
        verifyNoInteractions(ledger);
    }

    @Test
    void withdrawFromFrozenAccountIsRejected() {
        savings.setStatus(AccountStatus.FROZEN);
        when(accountService.getOwned(rahul, "NB10000001")).thenReturn(savings);

        var req = new DepositWithdrawRequest("NB10000001", new BigDecimal("100"), TransactionMode.ATM, null);

        assertThatThrownBy(() -> service.withdraw("rahul@test.in", req))
                .hasFieldOrPropertyWithValue("code", "ACCOUNT_NOT_ACTIVE");
    }

    @Test
    void dailyWithdrawLimitIsEnforced() {
        savings.setBalance(new BigDecimal("200000"));
        when(accountService.getOwned(rahul, "NB10000001")).thenReturn(savings);
        when(txnRepo.sumSince(eq("NB10000001"), eq(TransactionType.WITHDRAW), any())).thenReturn(new BigDecimal("45000"));

        var req = new DepositWithdrawRequest("NB10000001", new BigDecimal("6000"), TransactionMode.CASH, null);

        assertThatThrownBy(() -> service.withdraw("rahul@test.in", req))
                .hasFieldOrPropertyWithValue("code", "DAILY_LIMIT_EXCEEDED");
    }

    @Test
    void transferToSameAccountIsRejected() {
        when(accountService.getOwned(rahul, "NB10000001")).thenReturn(savings);
        var req = new TransferRequest("NB10000001", "nb10000001", new BigDecimal("100"), TransactionMode.IMPS, null, "1234");

        assertThatThrownBy(() -> service.transfer("rahul@test.in", req))
                .hasFieldOrPropertyWithValue("code", "SAME_ACCOUNT");
    }

    @Test
    void rtgsBelowTwoLakhIsRejected() {
        assertThatThrownBy(() -> TransactionService.checkModeLimits(TransactionMode.RTGS, new BigDecimal("150000")))
                .hasFieldOrPropertyWithValue("code", "TRANSFER_LIMIT");
    }

    @Test
    void wrongPinBlocksTransfer() {
        User priya = new User("Priya", "priya@test.in", "hash", "8888888888", Role.CUSTOMER);
        Account target = new Account("NB10000002", priya, AccountType.SAVINGS, null);
        when(accountService.getOwned(rahul, "NB10000001")).thenReturn(savings);
        when(accountRepo.findById("NB10000002")).thenReturn(Optional.of(target));
        doThrow(ApiException.forbidden("INVALID_PIN", "Incorrect transaction PIN"))
                .when(userService).verifyPin(rahul, "0000");

        var req = new TransferRequest("NB10000001", "NB10000002", new BigDecimal("100"), TransactionMode.IMPS, null, "0000");

        assertThatThrownBy(() -> service.transfer("rahul@test.in", req))
                .hasFieldOrPropertyWithValue("code", "INVALID_PIN");
        verifyNoInteractions(ledger);
    }
}
