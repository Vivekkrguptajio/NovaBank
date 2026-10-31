export default function AuthHero() {
  return (
    <div className="auth-hero">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="brand" style={{ padding: 0 }}><div className="logo">◆</div>NovaBank</div>
        <h1>Banking that's simple,<br />secure and instant.</h1>
        <p>Open accounts, move money, apply for loans and track every rupee — all from one dashboard.</p>
        <div className="feat">
          <div><b>Instant transfers</b>IMPS · NEFT · RTGS</div>
          <div><b>Smart loans</b>Live EMI & eligibility</div>
          <div><b>JWT security</b>Role-based access</div>
          <div><b>Full history</b>Filter & export CSV</div>
        </div>
      </div>
      <div className="stack" style={{ position: 'relative', zIndex: 1 }}>
        {['Java 17', 'Spring Boot 3', 'Spring Security + JWT', 'MySQL', 'React', 'JUnit 5', 'Docker'].map((s) => <span key={s}>{s}</span>)}
      </div>
    </div>
  )
}
