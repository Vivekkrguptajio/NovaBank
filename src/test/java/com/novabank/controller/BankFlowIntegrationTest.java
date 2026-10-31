package com.novabank.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novabank.entity.Enums.Role;
import com.novabank.entity.User;
import com.novabank.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end test of the real API (all layers + H2 in-memory DB):
 * register -> login -> deposit -> transfer -> history -> loan -> admin approve.
 */
@SpringBootTest
@AutoConfigureMockMvc
class BankFlowIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;

    @Test
    void fullBankingFlow() throws Exception {
        // 1. Register two customers (each gets a first account)
        JsonNode amit = register("Amit", "amit@test.in", "SAVINGS", 10000);
        JsonNode neha = register("Neha", "neha@test.in", "SAVINGS", 5000);
        String amitToken = amit.get("token").asText();
        String nehaToken = neha.get("token").asText();
        String amitAcc = firstAccount(amitToken);
        String nehaAcc = firstAccount(nehaToken);

        // 2. Login works and wrong password gives 401
        post("/api/auth/login", null, Map.of("email", "amit@test.in", "password", "secret123")).andExpect(status().isOk());
        post("/api/auth/login", null, Map.of("email", "amit@test.in", "password", "wrong"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        // 3. Deposit 2,500
        post("/api/transactions/deposit", amitToken, Map.of("accountNo", amitAcc, "amount", 2500, "mode", "UPI"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balanceAfter").value(12500.0));

        // 4. Transfer 3,000 to Neha (PIN 1234)
        post("/api/transactions/transfer", amitToken, Map.of("fromAccountNo", amitAcc, "toAccountNo", nehaAcc,
                "amount", 3000, "mode", "IMPS", "remark", "Dinner", "pin", "1234"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.beneficiaryName").value("Neha"))
                .andExpect(jsonPath("$.balanceAfter").value(9500.0));

        // 5. Wrong PIN -> 403, overdraft -> 422
        post("/api/transactions/transfer", amitToken, Map.of("fromAccountNo", amitAcc, "toAccountNo", nehaAcc,
                "amount", 10, "mode", "IMPS", "pin", "9999"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("INVALID_PIN"));
        post("/api/transactions/withdraw", amitToken, Map.of("accountNo", amitAcc, "amount", 9000))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INSUFFICIENT_BALANCE"));

        // 6. Balances and history
        mvc.perform(get("/api/accounts/" + nehaAcc + "/balance").header("Authorization", "Bearer " + nehaToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ledgerBalance").value(8000.0));
        mvc.perform(get("/api/transactions").param("accountNo", amitAcc).header("Authorization", "Bearer " + amitToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3));

        // 7. Neha cannot read Amit's account
        mvc.perform(get("/api/accounts/" + amitAcc).header("Authorization", "Bearer " + nehaToken))
                .andExpect(status().isForbidden());

        // 8. Loan: apply -> admin approves -> money credited
        String loanJson = post("/api/loans/apply", amitToken, Map.of("type", "PERSONAL", "amount", 100000,
                "tenureMonths", 24, "monthlyIncome", 50000, "purpose", "Laptop", "creditAccountNo", amitAcc))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        long loanId = json.readTree(loanJson).get("id").asLong();

        mvc.perform(put("/api/admin/loans/" + loanId + "/approve").header("Authorization", "Bearer " + amitToken))
                .andExpect(status().isForbidden());   // customers cannot approve

        String adminToken = adminToken();
        mvc.perform(put("/api/admin/loans/" + loanId + "/approve").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));
        mvc.perform(get("/api/accounts/" + amitAcc + "/balance").header("Authorization", "Bearer " + amitToken))
                .andExpect(jsonPath("$.ledgerBalance").value(109500.0));
    }

    @Test
    void protectedEndpointsNeedToken() throws Exception {
        mvc.perform(get("/api/accounts/my")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/loans/emi-calculator").param("amount", "500000").param("rate", "11.5").param("tenure", "36"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.emi").value(16488.0));
    }

    @Test
    void validationErrorsAreReadable() throws Exception {
        post("/api/auth/register", null, Map.of("name", "", "email", "not-an-email"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.email").exists());
    }

    // ---------- helpers ----------

    private JsonNode register(String name, String email, String type, int deposit) throws Exception {
        String body = post("/api/auth/register", null, Map.of("name", name, "email", email, "phone", "9876543210",
                "password", "secret123", "transactionPin", "1234", "accountType", type, "initialDeposit", deposit))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body);
    }

    private String firstAccount(String token) throws Exception {
        String body = mvc.perform(get("/api/accounts/my").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode list = json.readTree(body);
        assertThat(list).hasSize(1);
        return list.get(0).get("accountNo").asText();
    }

    private String adminToken() throws Exception {
        if (users.findByEmailIgnoreCase("boss@test.in").isEmpty()) {
            users.save(new User("Boss", "boss@test.in", encoder.encode("admin123"), "9000000000", Role.ADMIN));
        }
        String body = post("/api/auth/login", null, Map.of("email", "boss@test.in", "password", "admin123"))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private ResultActions post(String url, String token, Object body) throws Exception {
        var req = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req);
    }
}
