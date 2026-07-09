export default function DebugSimple() {
  return (
    <div style={{ padding: "20px", backgroundColor: "white", color: "black" }}>
      <h1>Debug Page Working!</h1>
      <p>If you can see this, the routing is working.</p>
      <p>Test login credentials:</p>
      <p>Email: test@example.com</p>
      <p>Password: password123</p>
      <div style={{ marginTop: "20px" }}>
        <a href="/auth" style={{ color: "blue", textDecoration: "underline" }}>
          Go to main login page
        </a>
      </div>
    </div>
  );
}