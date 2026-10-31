package com.novabank.config;

import com.novabank.entity.Account;
import com.novabank.entity.Enums.*;
import com.novabank.entity.Loan;
import com.novabank.entity.User;
import com.novabank.repository.LoanRepository;
import com.novabank.repository.UserRepository;
import com.novabank.service.AccountService;
import com.novabank.service.LedgerService;
import com.novabank.service.LoanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Creates demo users on first start (only when the users table is empty).
 *   Admin    : admin@novabank.in / admin123
 *   Customer : rahul@novabank.in / demo123   (PIN 1234)
 *   Customer : priya@novabank.in / demo123   (PIN 1234)
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final LoanRepository loans;
    private final PasswordEncoder encoder;
    private final AccountService accountService;
    private final LedgerService ledger;

    public DataSeeder(UserRepository users, LoanRepository loans, PasswordEncoder encoder,
                      AccountService accountService, LedgerService ledger) {
        this.users = users;
        this.loans = loans;
        this.encoder = encoder;
        this.accountService = accountService;
        this.ledger = ledger;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;

        users.save(newUser("Bank Admin", "admin@novabank.in", "admin123", "+91 90000 00001", Role.ADMIN, "Mumbai"));
        User rahul = users.save(newUser("Rahul Sharma", "rahul@novabank.in", "demo123", "+91 98765 43210", Role.CUSTOMER, "Patna"));
        User priya = users.save(newUser("Priya Verma", "priya@novabank.in", "demo123", "+91 99887 76655", Role.CUSTOMER, "Pune"));

        Account rSav = accountService.openAccount(rahul, AccountType.SAVINGS, bd(10000), null, "Sunita Sharma");
        Account rCur = accountService.openAccount(rahul, AccountType.CURRENT, bd(50000), null, "Sunita Sharma");
        Account pSav = accountService.openAccount(priya, AccountType.SAVINGS, bd(20000), null, null);

        credit(rSav, 45000, TransactionMode.NEFT, "Salary - Infotech Pvt Ltd");
        credit(rCur, 80000, TransactionMode.RTGS, "Client payment");
        debit(rSav, 6000, TransactionType.WITHDRAW, TransactionMode.ATM, "ATM withdrawal");
        credit(pSav, 38000, TransactionMode.NEFT, "Salary");

        String ref = LedgerService.newReference("TRF");
        ledger.debit(rSav, bd(5000), TransactionType.TRANSFER_OUT, TransactionMode.UPI, "To Priya Verma", ref);
        ledger.credit(pSav, bd(5000), TransactionType.TRANSFER_IN, TransactionMode.UPI, "From Rahul Sharma", ref);

        loans.save(new Loan(rahul, rSav, LoanType.CAR, bd(650000), 60,
                LoanService.calculateEmi(bd(650000), LoanType.CAR.getAnnualRate(), 60), bd(85000), "New car purchase"));
        loans.save(new Loan(priya, pSav, LoanType.PERSONAL, bd(200000), 24,
                LoanService.calculateEmi(bd(200000), LoanType.PERSONAL.getAnnualRate(), 24), bd(60000), "Home renovation"));

        log.info("Demo data created -> admin@novabank.in/admin123, rahul@novabank.in/demo123 (PIN 1234)");
    }

    private User newUser(String name, String email, String pwd, String phone, Role role, String city) {
        User u = new User(name, email, encoder.encode(pwd), phone, role);
        u.setCity(city);
        u.setPinHash(encoder.encode("1234"));
        return u;
    }

    private void credit(Account a, long amt, TransactionMode mode, String desc) {
        ledger.credit(a, bd(amt), TransactionType.DEPOSIT, mode, desc, LedgerService.newReference("DEP"));
    }

    private void debit(Account a, long amt, TransactionType type, TransactionMode mode, String desc) {
        ledger.debit(a, bd(amt), type, mode, desc, LedgerService.newReference("WDL"));
    }

    private static BigDecimal bd(long v) {
        return BigDecimal.valueOf(v);
    }
}
