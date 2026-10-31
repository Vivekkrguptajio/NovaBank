package com.novabank.dto;

import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class CommonDtos {

    private CommonDtos() {}

    /** Simple, frontend-friendly page wrapper (instead of Spring's verbose Page JSON). */
    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
        public static <T> PageResponse<T> of(Page<T> p) {
            return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(),
                    p.getTotalPages());
        }
    }

    public record ErrorResponse(LocalDateTime timestamp, int status, String code, String message,
                                Map<String, String> fieldErrors) {}

    public record MessageResponse(String message) {}

    public record AdminStatsResponse(long totalCustomers, long totalAccounts, BigDecimal totalDeposits,
                                     long pendingLoans, BigDecimal pendingLoanAmount, BigDecimal loansDisbursed,
                                     long transactionsToday) {}

    public record CustomerSummary(Long id, String name, String email, String phone, String city,
                                  LocalDateTime joinedAt, int accounts, BigDecimal totalBalance, long loans) {}
}
