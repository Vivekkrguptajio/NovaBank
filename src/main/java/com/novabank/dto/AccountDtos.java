package com.novabank.dto;

import com.novabank.entity.Account;
import com.novabank.entity.Enums.AccountStatus;
import com.novabank.entity.Enums.AccountType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class AccountDtos {

    private AccountDtos() {}

    public record CreateAccountRequest(
            @NotNull AccountType type,
            @NotNull @Positive BigDecimal initialDeposit,
            /* optional: move the opening money from one of my existing accounts */
            String fundFromAccountNo,
            @Size(max = 100) String nominee) {}

    public record UpdateStatusRequest(@NotNull AccountStatus status) {}

    public record AccountResponse(String accountNo, String holderName, AccountType type, BigDecimal balance,
                                  AccountStatus status, String ifsc, String branch, String nominee,
                                  BigDecimal minimumBalance, LocalDateTime openedAt) {
        public static AccountResponse from(Account a) {
            return new AccountResponse(a.getAccountNo(), a.getUser().getName(), a.getType(), a.getBalance(),
                    a.getStatus(), a.getIfsc(), a.getBranch(), a.getNominee(), a.getType().getMinimumBalance(),
                    a.getOpenedAt());
        }
    }

    public record BalanceResponse(String accountNo, AccountType type, BigDecimal ledgerBalance,
                                  BigDecimal availableBalance, BigDecimal withdrawableBalance,
                                  AccountStatus status, LocalDateTime asOf) {}

    /** Public info shown when a user types a beneficiary account number. */
    public record BeneficiaryResponse(String accountNo, String holderName, AccountType type, String branch,
                                      boolean canReceive) {}

    public record MiniStatementResponse(String accountNo, BigDecimal balance,
                                        List<TransactionDtos.TransactionResponse> lastTransactions) {}
}
