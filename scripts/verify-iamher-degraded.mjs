const base = process.argv[2] || "http://127.0.0.1:5008";

async function main() {
  const summaryResp = await fetch(`${base}/api/iam-her/summary`);
  const summary = await summaryResp.json();
  console.log(`summary_status=${summaryResp.status} degraded=${summary?.degraded === true}`);

  const appsResp = await fetch(`${base}/api/event-applications?eventKey=iamher-2026-08-28`);
  const apps = await appsResp.json();
  console.log(`applications_status=${appsResp.status} isArray=${Array.isArray(apps)}`);

  const contactResp = await fetch(`${base}/api/event-august/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Local Tester",
      email: "local@test.com",
      message: "Hello I AM HER",
      website: "",
      event: "iam-her",
    }),
  });
  const contact = await contactResp.json();
  console.log(`contact_status=${contactResp.status} ok=${contact?.ok === true} degraded=${contact?.degraded === true}`);
}

main().catch((err) => {
  console.error("verify-iamher-degraded failed:", err?.message || err);
  process.exit(1);
});
