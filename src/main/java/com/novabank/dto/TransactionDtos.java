package com.novabank.dto;

import com.novabank.entity.Enums.TransactionMode;
import com.novabank.entity.Enums.TransactionType;
import com.novabank.entity.Transaction;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class TransactionDtos {

    private TransactionDtos() {}

    public record DepositWithdrawRequest(
            @NotBlank String accountNo,
            @NotNull @Positive @Digits(integer = 13, fraction = 2) BigDecimal amount,
            TransactionMode mode,
            @Size(max = 150) String remark) {}

    public record TransferRequest(
            @NotBlank String fromAccountNo,
            @NotBlank String toAccountNo,
            @NotNull @Positive @Digits(integer = 13, fraction = 2) BigDecimal amount,
            @NotNull TransactionMode mode,
            @Size(max = 150) String remark,
            @NotBlank @Pattern(regexp = "\\d{4}", message = "must be exactly 4 digits") String pin) {}

    public record TransactionResponse(Long id, String referenceId, String accountNo, TransactionType type,
                                      TransactionMode mode, BigDecimal amount, BigDecimal balanceAfter,
                                      String description, boolean credit, LocalDateTime createdAt) {
        public static TransactionResponse from(Transaction t) {
            return new TransactionResponse(t.getId(), t.getReferenceId(), t.getAccount().getAccountNo(), t.getType(),
                    t.getMode(), t.getAmount(), t.getBalanceAfter(), t.getDescription(), t.getType().isCredit(),
                    t.getCreatedAt());
        }
    }

    /** Receipt returned after a transfer: both legs share the same referenceId. */
    public record TransferResponse(String referenceId, String fromAccountNo, String toAccountNo,
                                   String beneficiaryName, BigDecimal amount, TransactionMode mode,
                                   BigDecimal balanceAfter, LocalDateTime createdAt) {}
}
