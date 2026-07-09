const base = process.argv[2] || "http://127.0.0.1:5007";

async function main() {
  const demoResp = await fetch(`${base}/api/growth/auth/demo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const demo = await demoResp.json();
  console.log(`demo_status=${demoResp.status} demo_ok=${Boolean(demo?.ok)} degraded=${Boolean(demo?.degraded)} token=${demo?.token ? "yes" : "no"}`);

  const meResp = await fetch(`${base}/api/growth/auth/me`, {
    headers: { authorization: `Bearer ${demo?.token || ""}` },
  });
  const me = await meResp.json();
  console.log(`me_status=${meResp.status} me_ok=${Boolean(me?.ok)} degraded=${Boolean(me?.degraded)} user=${me?.user?.email || "none"}`);

  const meLooseResp = await fetch(`${base}/api/growth/auth/me`, {
    headers: { authorization: `bearer    ${demo?.token || ""}   ` },
  });
  console.log(`me_case_space_status=${meLooseResp.status}`);
}

main().catch((err) => {
  console.error("verify-growth-auth-flow failed:", err?.message || err);
  process.exit(1);
});
