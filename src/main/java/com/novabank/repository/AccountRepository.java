package com.novabank.repository;

import com.novabank.entity.Account;
import com.novabank.entity.Enums.AccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface AccountRepository extends JpaRepository<Account, String> {

    List<Account> findByUserIdAndStatusNotOrderByOpenedAtAsc(Long userId, AccountStatus status);

    List<Account> findByStatusNotOrderByOpenedAtDesc(AccountStatus status);

    /** Returns null when there are no accounts. */
    @Query("select sum(a.balance) from Account a where a.status <> :excluded")
    BigDecimal sumBalanceExcluding(@Param("excluded") AccountStatus excluded);

    long countByStatusNot(AccountStatus status);
}
