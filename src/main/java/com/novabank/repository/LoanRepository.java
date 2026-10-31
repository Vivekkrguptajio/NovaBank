package com.novabank.repository;

import com.novabank.entity.Enums.LoanStatus;
import com.novabank.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    List<Loan> findByUserIdOrderByAppliedAtDesc(Long userId);

    List<Loan> findByStatusOrderByAppliedAtAsc(LoanStatus status);

    List<Loan> findAllByOrderByAppliedAtDesc();

    long countByStatus(LoanStatus status);

    long countByUserId(Long userId);

    @Query("select sum(l.amount) from Loan l where l.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") LoanStatus status);
}
