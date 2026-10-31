package com.novabank.entity;

import java.math.BigDecimal;

/** All enums used by the entities, kept in one place for easy reading. */
public final class Enums {

    private Enums() {}

    public enum Role { CUSTOMER, ADMIN }

    public enum AccountType {
        SAVINGS(new BigDecimal("1000")),
        CURRENT(new BigDecimal("5000"));

        private final BigDecimal minimumBalance;

        AccountType(BigDecimal minimumBalance) { this.minimumBalance = minimumBalance; }

        public BigDecimal getMinimumBalance() { return minimumBalance; }
    }

    public enum AccountStatus { ACTIVE, FROZEN, CLOSED }

    public enum TransactionType {
        DEPOSIT(true), WITHDRAW(false), TRANSFER_IN(true), TRANSFER_OUT(false), LOAN_CREDIT(true), INTEREST(true);

        private final boolean credit;

        TransactionType(boolean credit) { this.credit = credit; }

        public boolean isCredit() { return credit; }
    }

    public enum TransactionMode { CASH, UPI, IMPS, NEFT, RTGS, CHEQUE, ATM, ONLINE, INTERNAL, SYSTEM }

    public enum LoanType {
        PERSONAL(new BigDecimal("11.5"), new BigDecimal("1500000")),
        HOME(new BigDecimal("8.5"), new BigDecimal("10000000")),
        CAR(new BigDecimal("9.2"), new BigDecimal("2000000")),
        EDUCATION(new BigDecimal("7.9"), new BigDecimal("3000000"));

        private final BigDecimal annualRate;
        private final BigDecimal maxAmount;

        LoanType(BigDecimal annualRate, BigDecimal maxAmount) {
            this.annualRate = annualRate;
            this.maxAmount = maxAmount;
        }

        public BigDecimal getAnnualRate() { return annualRate; }
        public BigDecimal getMaxAmount() { return maxAmount; }
    }

    public enum LoanStatus { PENDING, APPROVED, REJECTED }
}
