package com.novabank.controller;

import com.novabank.dto.CommonDtos.PageResponse;
import com.novabank.dto.TransactionDtos.*;
import com.novabank.entity.Enums.TransactionType;
import com.novabank.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService txnService;

    public TransactionController(TransactionService txnService) {
        this.txnService = txnService;
    }

    @PostMapping("/deposit")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse deposit(Authentication auth, @Valid @RequestBody DepositWithdrawRequest req) {
        return txnService.deposit(auth.getName(), req);
    }

    @PostMapping("/withdraw")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse withdraw(Authentication auth, @Valid @RequestBody DepositWithdrawRequest req) {
        return txnService.withdraw(auth.getName(), req);
    }

    @PostMapping("/transfer")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferResponse transfer(Authentication auth, @Valid @RequestBody TransferRequest req) {
        return txnService.transfer(auth.getName(), req);
    }

    /** e.g. GET /api/transactions?accountNo=NB10023451&type=DEPOSIT&from=2026-10-01&to=2026-10-31&q=salary&page=0&size=10 */
    @GetMapping
    public PageResponse<TransactionResponse> history(Authentication auth,
            @RequestParam(name = "accountNo", required = false) String accountNo,
            @RequestParam(name = "type", required = false) TransactionType type,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        return txnService.history(auth.getName(), accountNo, type, from, to, q, page, size);
    }

    @GetMapping("/recent")
    public List<TransactionResponse> recent(Authentication auth) {
        return txnService.recent(auth.getName());
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<String> export(Authentication auth,
            @RequestParam(name = "accountNo", required = false) String accountNo,
            @RequestParam(name = "type", required = false) TransactionType type,
            @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "q", required = false) String q) {
        String csv = txnService.exportCsv(auth.getName(), accountNo, type, from, to, q);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"statement.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
