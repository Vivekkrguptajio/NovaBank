package com.novabank.entity;

import com.novabank.entity.Enums.AccountStatus;
import com.novabank.entity.Enums.AccountType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @Column(length = 12)
    private String accountNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountType type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Column(length = 11)
    private String ifsc = "NOVA0001023";

    @Column(length = 60)
    private String branch = "Online";

    @Column(length = 100)
    private String nominee;

    /** Optimistic locking: protects balance from two parallel updates. */
    @Version
    private Long version;

    @Column(nullable = false, updatable = false)
    private LocalDateTime openedAt = LocalDateTime.now();

    public Account() {}

    public Account(String accountNo, User user, AccountType type, String nominee) {
        this.accountNo = accountNo;
        this.user = user;
        this.type = type;
        this.nominee = nominee;
    }

    public boolean isActive() { return status == AccountStatus.ACTIVE; }

    public String getAccountNo() { return accountNo; }
    public User getUser() { return user; }
    public AccountType getType() { return type; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public AccountStatus getStatus() { return status; }
    public void setStatus(AccountStatus status) { this.status = status; }
    public String getIfsc() { return ifsc; }
    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
    public String getNominee() { return nominee; }
    public LocalDateTime getOpenedAt() { return openedAt; }
}
