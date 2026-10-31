# NovaBank — Bank Management System (Spring Boot)

REST backend for a banking app: account creation, deposit/withdraw, money transfer, loan application and approval, transaction history and balance inquiry. It uses JWT login and separate customer/admin roles.

**Stack:** Java 17 · Spring Boot 3.3 · Spring Security + JWT · Spring Data JPA (Hibernate) · MySQL 8 · JUnit 5 + Mockito + MockMvc · Docker · Swagger UI

The project has two parts:
- **Backend** (this folder): Spring Boot REST API. Open it in IntelliJ.
- **Frontend** (`frontend/`): React app that calls these APIs. See [frontend/README.md](frontend/README.md).

`docs/ui-demo.html` is a standalone clickable prototype (fake data) of the same screens.

---

## 1. Run it in IntelliJ IDEA (step by step)

### What you need
| Tool | Version | Check |
|---|---|---|
| IntelliJ IDEA | Community or Ultimate | — |
| JDK | 17 or newer | `java -version` |
| MySQL | 8.x running on port 3306 | MySQL Workbench / `mysql -u root -p` |

> No MySQL installed? Run only the database with Docker:
> `docker run -d --name novabank-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=novabank -p 3306:3306 mysql:8.4`

### Steps
1. **Unzip** the project, then in IntelliJ: **File → Open →** select the `novabank` folder (the one that contains `pom.xml`) → **Open as Project** → **Trust Project**.
2. Wait for IntelliJ to finish **"Resolving Maven dependencies"** (bottom-right progress bar; the first run takes 2–5 minutes).
   If it doesn't start: open the **Maven** tab on the right → click the 🔄 **Reload All Maven Projects** button.
3. **Set the JDK:** **File → Project Structure → Project → SDK →** choose 17+ (or **Download JDK → Eclipse Temurin 17**).
4. **Set your MySQL password:** open `src/main/resources/application.yml`. The default is `root` / `root`. If yours is different, either
   - edit `password: ${DB_PASSWORD:root}` → change `root` to your password, **or**
   - in **Run → Edit Configurations → Environment variables** add `DB_PASSWORD=yourpassword`.
   The `novabank` database is created automatically (`createDatabaseIfNotExist=true`), and Hibernate creates the tables.
5. Open `src/main/java/com/novabank/NovaBankApplication.java` → click the green ▶ next to `main` → **Run**.
6. When the console shows `Started NovaBankApplication` and `Demo data created`:
   - Swagger UI → http://localhost:8080/swagger-ui.html
   - or open **`api-requests.http`** in IntelliJ and click ▶ on each request (run **Login as Rahul** first).

### Demo logins (created automatically on first start)
| Role | Email | Password | Transaction PIN |
|---|---|---|---|
| Customer | rahul@novabank.in | demo123 | 1234 |
| Customer | priya@novabank.in | demo123 | 1234 |
| Admin | admin@novabank.in | admin123 | — |

**Using Swagger with JWT:** call `POST /api/auth/login`, copy the `token` from the response, click **Authorize** (top right) and paste the token. All locked endpoints now work.

### Run the tests
Right-click the `src/test/java` folder → **Run 'All Tests'**, or from the terminal: `mvn test`.
The tests use an in-memory **H2** database, so MySQL is not needed for them.

| Test | Type | What it checks |
|---|---|---|
| `LoanServiceTest` | Unit | EMI formula, totals, invalid input |
| `TransactionServiceTest` | Unit (Mockito) | Minimum balance, frozen account, daily limit, RTGS limit, wrong PIN, same-account transfer |
| `BankFlowIntegrationTest` | Integration (MockMvc + H2) | Register → login → deposit → transfer → history → loan → admin approval, plus 401/403/422 cases |

---

### Start the React frontend
Keep the backend running. Then in IntelliJ open **View → Tool Windows → Terminal** and run:
```bash
cd frontend
npm install     # first time only (needs Node.js 20+)
npm run dev
```
Open **http://localhost:5173** and log in with the demo accounts above.

---

## 2. Run everything with Docker
```bash
docker compose up --build
```
This starts MySQL (on host port 3307) and the API (on port 8080). Stop it with `docker compose down`. Add `-v` to also delete the data.

---

## 3. Project structure
```
src/main/java/com/novabank
├── NovaBankApplication.java     ← main()
├── config/       SecurityConfig (JWT, CORS, roles) · OpenApiConfig (Swagger) · DataSeeder (demo data)
├── security/     JwtService (create/verify tokens) · JwtAuthFilter (reads Bearer token)
├── entity/       User · Account · Transaction · Loan · Enums
├── repository/   Spring Data JPA interfaces (custom JPQL for filtered history)
├── dto/          Request/response records + validation annotations
├── service/      Business logic
│   ├── LedgerService       ← the ONLY place balances change (always writes a Transaction row)
│   ├── AccountService      ← open/close/freeze, balance, mini statement, beneficiary lookup
│   ├── TransactionService  ← deposit, withdraw, transfer (@Transactional), history, CSV export
│   ├── LoanService         ← EMI, eligibility, apply, schedule, approve/reject
│   ├── AuthService · UserService · AdminService
├── controller/   REST endpoints
└── exception/    ApiException + GlobalExceptionHandler (one JSON error format)
```

## 4. API endpoints
| Method | Endpoint | Who | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register and open the first account (returns JWT) |
| POST | `/api/auth/login` | Public | Log in and get a JWT |
| GET/PUT | `/api/users/me` | User | View / update profile |
| PUT | `/api/users/me/password` · `/pin` | User | Change password / transaction PIN |
| POST | `/api/accounts` | Customer | Open a new account |
| GET | `/api/accounts/my` | Customer | List my accounts |
| GET | `/api/accounts/{no}` · `/balance` · `/mini-statement` | Owner | Details, balance, last 5 transactions |
| GET | `/api/accounts/lookup/{no}` | User | Beneficiary name check |
| PUT | `/api/accounts/{no}/status` | Owner | Freeze / unfreeze |
| DELETE | `/api/accounts/{no}` | Owner | Close (balance must be ₹0) |
| POST | `/api/transactions/deposit` · `/withdraw` · `/transfer` | Customer | Move money |
| GET | `/api/transactions` | Customer | History (`accountNo, type, from, to, q, page, size`) |
| GET | `/api/transactions/recent` · `/export` | Customer | Dashboard list / CSV statement |
| GET | `/api/loans/emi-calculator` | Public | EMI preview |
| POST | `/api/loans/apply` | Customer | Apply for a loan |
| GET | `/api/loans/my` · `/{id}/schedule` | Owner | My loans / EMI schedule |
| GET | `/api/admin/stats` · `/users` · `/accounts` · `/transactions` · `/loans?status=` | Admin | Admin views |
| PUT | `/api/admin/loans/{id}/approve` · `/reject` | Admin | Decide a loan (approval credits the money) |
| PUT | `/api/admin/accounts/{no}/status` | Admin | Freeze / unfreeze any account |

## 5. Business rules
- **Minimum balance:** Savings ₹1,000, Current ₹5,000 (checked on withdraw, transfer and opening).
- **Daily withdrawal limit:** ₹50,000 per account.
- **Transfer limits:** UPI ≤ ₹1L, IMPS ≤ ₹5L, RTGS ≥ ₹2L, NEFT has no limit. A 4-digit PIN is required (stored as a BCrypt hash).
- **Transfers are atomic:** debit and credit run inside one `@Transactional` method. `@Version` (optimistic locking) prevents lost updates.
- **Loans:** the EMI must be ≤ 50% of monthly income. Statuses: PENDING → APPROVED (amount credited to the chosen account) or REJECTED (with a reason).
- **Errors:** every error returns the same JSON:
  `{ "status": 422, "code": "INSUFFICIENT_BALANCE", "message": "...", "fieldErrors": null }`
  Codes used: 400 validation · 401 not logged in · 403 wrong PIN / not your account · 404 not found · 409 email exists · 422 business rule broken.

## 6. Interview talking points
- Why `BigDecimal` instead of `double` for money (rounding errors).
- How `@Transactional` makes a transfer all-or-nothing.
- Stateless JWT authentication vs. sessions; how the filter sets the `SecurityContext`.
- The ledger pattern: balance and transaction history can never drift apart.
- Optimistic locking (`@Version`) for concurrent withdrawals.
- Testing pyramid: fast unit tests with Mockito plus one integration test against H2.
