package com.novabank.dto;

import com.novabank.entity.Enums.LoanStatus;
import com.novabank.entity.Enums.LoanType;
import com.novabank.entity.Loan;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class LoanDtos {

    private LoanDtos() {}

    public record LoanApplyRequest(
            @NotNull LoanType type,
            @NotNull @DecimalMin("10000") BigDecimal amount,
            @NotNull @Min(6) @Max(360) Integer tenureMonths,
            @NotNull @Positive BigDecimal monthlyIncome,
            @NotBlank @Size(max = 150) String purpose,
            @NotBlank String creditAccountNo) {}

    public record RejectRequest(@NotBlank @Size(max = 150) String reason) {}

    public record LoanResponse(Long id, Long userId, String customerName, LoanType type, BigDecimal amount,
                               Integer tenureMonths, BigDecimal annualRate, BigDecimal emi,
                               BigDecimal monthlyIncome, BigDecimal emiToIncomePercent, String purpose,
                               String creditAccountNo, LoanStatus status, String rejectionReason,
                               LocalDateTime appliedAt, LocalDateTime decidedAt) {
        public static LoanResponse from(Loan l) {
            BigDecimal ratio = l.getEmi().multiply(BigDecimal.valueOf(100))
                    .divide(l.getMonthlyIncome(), 2, java.math.RoundingMode.HALF_UP);
            return new LoanResponse(l.getId(), l.getUser().getId(), l.getUser().getName(), l.getType(),
                    l.getAmount(), l.getTenureMonths(), l.getAnnualRate(), l.getEmi(), l.getMonthlyIncome(), ratio,
                    l.getPurpose(), l.getCreditAccount().getAccountNo(), l.getStatus(), l.getRejectionReason(),
                    l.getAppliedAt(), l.getDecidedAt());
        }
    }

    public record EmiResponse(BigDecimal principal, BigDecimal annualRate, int tenureMonths, BigDecimal emi,
                              BigDecimal totalInterest, BigDecimal totalPayable) {}

    public record ScheduleRow(int month, BigDecimal emi, BigDecimal principal, BigDecimal interest,
                              BigDecimal balance) {}

    public record ScheduleResponse(Long loanId, EmiResponse summary, List<ScheduleRow> rows) {}
}
