import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { useToast } from "@/hooks/use-toast";

type ApplicationRow = {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	role: string;
	company?: string | null;
	submitted_at?: string;
	first_reviewer_decision?: string | null;
	first_reviewer_note?: string | null;
	final_status?: string | null;
	applicant_response?: string | null;
	question_asked_at?: string | null;
	question_answered_at?: string | null;
};

type ReviewerDecision = "recommend_yes" | "recommend_no" | "need_more_info";

export default function ApplicationsReviewPage() {
	const { toast } = useToast();
	const [notesById, setNotesById] = useState<Record<number, string>>({});
	const [submittingId, setSubmittingId] = useState<number | null>(null);

	const adminFetch = (url: string, init: RequestInit = {}) => {
		const token = localStorage.getItem("token");
		const headers: Record<string, string> = {
			...((init.headers as Record<string, string>) || {}),
		};
		if (token) headers.Authorization = `Bearer ${token}`;
		return fetch(url, { ...init, headers, credentials: "include" });
	};

	const queueQuery = useQuery<ApplicationRow[]>({
		queryKey: ["/api/event-applications/reviewer/queue"],
		queryFn: async () => {
			const res = await adminFetch("/api/event-applications/reviewer/queue");
			if (!res.ok) throw new Error("Failed to load reviewer queue");
			return res.json();
		},
		refetchInterval: 60000,
	});

	const allQuery = useQuery<ApplicationRow[]>({
		queryKey: ["/api/event-applications/all"],
		queryFn: async () => {
			const res = await adminFetch("/api/event-applications/all");
			if (!res.ok) throw new Error("Failed to load application history");
			return res.json();
		},
		refetchInterval: 120000,
	});

	const queue = queueQuery.data || [];
	const all = allQuery.data || [];

	const stats = useMemo(() => {
		const pendingFirstReview = queue.length;
		const waitingApplicant = all.filter((a) => a.first_reviewer_decision === "need_more_info" && a.final_status === "pending").length;
		const recommendedYes = all.filter((a) => a.first_reviewer_decision === "recommend_yes").length;
		const recommendedNo = all.filter((a) => a.first_reviewer_decision === "recommend_no").length;
		return { pendingFirstReview, waitingApplicant, recommendedYes, recommendedNo };
	}, [all, queue]);

	const decide = async (applicationId: number, decision: ReviewerDecision) => {
		const note = (notesById[applicationId] || "").trim();
		if (!note) {
			toast({
				title: "Note required",
				description: "A one-line note is required for every reviewer decision.",
				variant: "destructive",
			});
			return;
		}

		try {
			setSubmittingId(applicationId);

			const res = await adminFetch("/api/event-applications/reviewer/decide", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ application_id: applicationId, decision, note }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.message || "Decision failed");

			await Promise.all([queueQuery.refetch(), allQuery.refetch()]);
			setNotesById((prev) => ({ ...prev, [applicationId]: "" }));
			toast({
				title: "Decision saved",
				description: `Application #${applicationId} marked ${decision}.`,
			});
		} catch (err: any) {
			toast({
				title: "Could not save decision",
				description: err?.message || "Unknown error",
				variant: "destructive",
			});
		} finally {
			setSubmittingId(null);
		}
	};

	const recentReviewed = all
		.filter((a) => a.first_reviewer_decision)
		.slice(0, 40);

	return (
		<div className="min-h-screen bg-gray-50">
			<PlannerSidebar />
			<main className="lg:ml-60" style={{ padding: "32px 24px" }}>
				<div style={{ maxWidth: 1220, margin: "0 auto" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
						<div>
							<h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#330311" }}>Applications First Reviewer</h1>
							<p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
								Stage 1 triage queue for The Woman Who Leads The Room.
							</p>
						</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
						{[
							["Pending First Review", stats.pendingFirstReview],
							["Waiting Applicant Reply", stats.waitingApplicant],
							["Recommended Yes", stats.recommendedYes],
							["Recommended No", stats.recommendedNo],
						].map(([label, value]) => (
							<div key={String(label)} style={{ background: "#fff", borderRadius: 10, padding: 14, borderTop: "3px solid #330311", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
								<div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
								<div style={{ fontSize: 28, fontWeight: 800, color: "#330311" }}>{value as any}</div>
							</div>
						))}
					</div>

					<div style={{ marginBottom: 20 }}>
						<h2 style={{ fontSize: 14, color: "#330311", margin: "0 0 10px", fontWeight: 800 }}>Reviewer Queue</h2>
						{queueQuery.isLoading ? (
							<div style={{ background: "#fff", borderRadius: 10, padding: 20, color: "#9ca3af" }}>Loading queue...</div>
						) : queue.length === 0 ? (
							<div style={{ background: "#fff", borderRadius: 10, padding: 20, color: "#6b7280" }}>No applications waiting for first review.</div>
						) : (
							<div style={{ display: "grid", gap: 12 }}>
								{queue.map((a) => (
									<div key={a.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", padding: 16 }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
											<div>
												<div style={{ fontSize: 16, fontWeight: 800, color: "#330311" }}>{a.first_name} {a.last_name}</div>
												<div style={{ fontSize: 12, color: "#6b7280" }}>{a.email} · {a.role}{a.company ? ` @ ${a.company}` : ""}</div>
											</div>
											<div style={{ fontSize: 11, color: "#6b7280", textAlign: "right" }}>
												<div>#{a.id}</div>
												<div>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-GB") : ""}</div>
											</div>
										</div>

										<textarea
											value={notesById[a.id] || ""}
											onChange={(e) => setNotesById((prev) => ({ ...prev, [a.id]: e.target.value }))}
											placeholder="One-line reviewer note (required)"
											style={{ width: "100%", minHeight: 72, border: "1px solid #d1d5db", borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 10 }}
										/>

										<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
											<button
												onClick={() => decide(a.id, "recommend_yes")}
												disabled={submittingId === a.id}
												style={{ background: "#166534", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: submittingId === a.id ? 0.6 : 1 }}
											>
												Recommend Yes
											</button>
											<button
												onClick={() => decide(a.id, "recommend_no")}
												disabled={submittingId === a.id}
												style={{ background: "#991b1b", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: submittingId === a.id ? 0.6 : 1 }}
											>
												Recommend No
											</button>
											<button
												onClick={() => decide(a.id, "need_more_info")}
												disabled={submittingId === a.id}
												style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: submittingId === a.id ? 0.6 : 1 }}
											>
												Ask Question
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div style={{ marginBottom: 20 }}>
						<h2 style={{ fontSize: 14, color: "#330311", margin: "0 0 10px", fontWeight: 800 }}>Awaiting Applicant Responses</h2>
						<div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflowX: "auto" }}>
							<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
								<thead>
									<tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
										{["ID", "Name", "Email", "Question Asked", "Answered", "Latest Response"].map((h) => (
											<th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>{h}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{all
										.filter((a) => a.first_reviewer_decision === "need_more_info" && a.final_status === "pending")
										.slice(0, 30)
										.map((a) => (
											<tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
												<td style={{ padding: "8px 12px", color: "#374151" }}>#{a.id}</td>
												<td style={{ padding: "8px 12px", color: "#374151" }}>{a.first_name} {a.last_name}</td>
												<td style={{ padding: "8px 12px", color: "#6b7280" }}>{a.email}</td>
												<td style={{ padding: "8px 12px", color: "#6b7280" }}>{a.question_asked_at ? new Date(a.question_asked_at).toLocaleDateString("en-GB") : "-"}</td>
												<td style={{ padding: "8px 12px", color: a.question_answered_at ? "#166534" : "#b45309", fontWeight: 700 }}>{a.question_answered_at ? "Yes" : "No"}</td>
												<td style={{ padding: "8px 12px", color: "#6b7280", maxWidth: 420, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{a.applicant_response || "-"}</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</div>

					<div>
						<h2 style={{ fontSize: 14, color: "#330311", margin: "0 0 10px", fontWeight: 800 }}>Recent First-Reviewer Decisions</h2>
						<div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflowX: "auto" }}>
							<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
								<thead>
									<tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
										{["ID", "Name", "Email", "Decision", "Final Status", "Submitted"].map((h) => (
											<th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>{h}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{recentReviewed.map((a) => (
										<tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
											<td style={{ padding: "8px 12px", color: "#374151" }}>#{a.id}</td>
											<td style={{ padding: "8px 12px", color: "#374151" }}>{a.first_name} {a.last_name}</td>
											<td style={{ padding: "8px 12px", color: "#6b7280" }}>{a.email}</td>
											<td style={{ padding: "8px 12px", color: "#6b7280" }}>{a.first_reviewer_decision || "-"}</td>
											<td style={{ padding: "8px 12px", color: a.final_status === "accepted" ? "#166534" : a.final_status === "declined" ? "#991b1b" : "#6b7280", fontWeight: 700 }}>{a.final_status || "pending"}</td>
											<td style={{ padding: "8px 12px", color: "#6b7280" }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-GB") : "-"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
