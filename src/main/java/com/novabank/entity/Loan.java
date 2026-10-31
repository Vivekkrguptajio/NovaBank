package com.novabank.entity;

import com.novabank.entity.Enums.LoanStatus;
import com.novabank.entity.Enums.LoanType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "loans")
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    /** Account where the money is credited after approval. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "credit_account_no")
    private Account creditAccount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LoanType type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private Integer tenureMonths;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal annualRate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal emi;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(length = 150)
    private String purpose;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LoanStatus status = LoanStatus.PENDING;

    @Column(length = 150)
    private String rejectionReason;

    @Column(nullable = false, updatable = false)
    private LocalDateTime appliedAt = LocalDateTime.now();

    private LocalDateTime decidedAt;

    public Loan() {}

    public Loan(User user, Account creditAccount, LoanType type, BigDecimal amount, Integer tenureMonths,
                BigDecimal emi, BigDecimal monthlyIncome, String purpose) {
        this.user = user;
        this.creditAccount = creditAccount;
        this.type = type;
        this.amount = amount;
        this.tenureMonths = tenureMonths;
        this.annualRate = type.getAnnualRate();
        this.emi = emi;
        this.monthlyIncome = monthlyIncome;
        this.purpose = purpose;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Account getCreditAccount() { return creditAccount; }
    public LoanType getType() { return type; }
    public BigDecimal getAmount() { return amount; }
    public Integer getTenureMonths() { return tenureMonths; }
    public BigDecimal getAnnualRate() { return annualRate; }
    public BigDecimal getEmi() { return emi; }
    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public String getPurpose() { return purpose; }
    public LoanStatus getStatus() { return status; }
    public void setStatus(LoanStatus status) { this.status = status; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }
}
