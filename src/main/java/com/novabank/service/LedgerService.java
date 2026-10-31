package com.novabank.service;

import com.novabank.entity.Account;
import com.novabank.entity.Enums.TransactionMode;
import com.novabank.entity.Enums.TransactionType;
import com.novabank.entity.Transaction;
import com.novabank.exception.ApiException;
import com.novabank.repository.AccountRepository;
import com.novabank.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * The ONLY place where an account balance changes.
 * Every balance change writes a Transaction row in the same DB transaction,
 * so the balance and the history can never go out of sync.
 */
@Service
public class LedgerService {

    private final AccountRepository accounts;
    private final TransactionRepository transactions;

    public LedgerService(AccountRepository accounts, TransactionRepository transactions) {
        this.accounts = accounts;
        this.transactions = transactions;
    }

    @Transactional
    public Transaction credit(Account account, BigDecimal amount, TransactionType type, TransactionMode mode,
                              String description, String referenceId) {
        if (!type.isCredit()) throw new IllegalArgumentException(type + " is not a credit type");
        account.setBalance(account.getBalance().add(amount));
        accounts.save(account);
        return transactions.save(new Transaction(account, type, mode, amount, account.getBalance(), description, referenceId));
    }

    @Transactional
    public Transaction debit(Account account, BigDecimal amount, TransactionType type, TransactionMode mode,
                             String description, String referenceId) {
        if (type.isCredit()) throw new IllegalArgumentException(type + " is not a debit type");
        if (account.getBalance().compareTo(amount) < 0) {
            throw ApiException.unprocessable("INSUFFICIENT_BALANCE", "Insufficient balance");
        }
        account.setBalance(account.getBalance().subtract(amount));
        accounts.save(account);
        return transactions.save(new Transaction(account, type, mode, amount, account.getBalance(), description, referenceId));
    }

    /** e.g. DEP-3F9A1C2B, TRF-7B21D0E4 */
    public static String newReference(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
