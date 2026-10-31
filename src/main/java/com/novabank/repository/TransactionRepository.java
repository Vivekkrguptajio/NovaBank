package com.novabank.repository;

import com.novabank.entity.Enums.TransactionType;
import com.novabank.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /** Filtered + paginated history. Any filter passed as null is ignored. */
    @Query("""
            select t from Transaction t
            where t.account.accountNo in :accountNos
              and (:type is null or t.type = :type)
              and (:from is null or t.createdAt >= :from)
              and (:to is null or t.createdAt < :to)
              and (:q = '' or lower(t.description) like lower(concat('%', :q, '%'))
                              or lower(t.referenceId) like lower(concat('%', :q, '%')))
            order by t.createdAt desc, t.id desc
            """)
    Page<Transaction> search(@Param("accountNos") Collection<String> accountNos,
                             @Param("type") TransactionType type,
                             @Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to,
                             @Param("q") String q,
                             Pageable pageable);

    List<Transaction> findTop5ByAccountAccountNoOrderByCreatedAtDescIdDesc(String accountNo);

    List<Transaction> findTop5ByAccountAccountNoInOrderByCreatedAtDescIdDesc(Collection<String> accountNos);

    Page<Transaction> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    /** Used for the daily withdrawal limit check. Returns null when nothing matched. */
    @Query("""
            select sum(t.amount) from Transaction t
            where t.account.accountNo = :accountNo and t.type = :type and t.createdAt >= :since
            """)
    BigDecimal sumSince(@Param("accountNo") String accountNo,
                        @Param("type") TransactionType type,
                        @Param("since") LocalDateTime since);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    long countByAccountAccountNo(String accountNo);
}
