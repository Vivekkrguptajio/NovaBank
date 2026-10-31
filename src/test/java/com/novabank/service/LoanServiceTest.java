package com.novabank.service;

import com.novabank.dto.LoanDtos.EmiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Pure unit tests for the EMI formula - no Spring context needed. */
class LoanServiceTest {

    @ParameterizedTest(name = "₹{0} @ {1}% for {2} months -> EMI ₹{3}")
    @CsvSource({
            "500000, 11.5, 36, 16488.00",
            "650000, 9.2, 60, 13556.11",
            "120000, 0, 12, 10000.00"
    })
    void calculatesEmi(String amount, String rate, int months, String expectedEmi) {
        BigDecimal emi = LoanService.calculateEmi(new BigDecimal(amount), new BigDecimal(rate), months);
        assertThat(emi).isEqualByComparingTo(expectedEmi);
    }

    @Test
    @DisplayName("Total payable = EMI x months, interest = total - principal")
    void emiPreviewTotals() {
        LoanService service = new LoanService(null, null, null, null);
        EmiResponse r = service.emiPreview(new BigDecimal("500000"), new BigDecimal("11.5"), 36);

        assertThat(r.totalPayable()).isEqualByComparingTo(r.emi().multiply(BigDecimal.valueOf(36)));
        assertThat(r.totalInterest()).isEqualByComparingTo(r.totalPayable().subtract(new BigDecimal("500000")));
    }

    @Test
    void rejectsZeroTenure() {
        assertThatThrownBy(() -> LoanService.calculateEmi(BigDecimal.TEN, BigDecimal.ONE, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
