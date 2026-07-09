export async function searchFindATender(keyword: string, status?: string): Promise<any[]> {
  const results: any[] = [];
  try {
    const params = new URLSearchParams({
      pageIndex: "1",
      pageSize: "100",
      keywords: keyword,
    });

    const url = `https://www.find-tender.service.gov.uk/api/1.0/ocds/notices/search?${params}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "EventPerfekt-TenderFinder/1.0",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.log(`Find a Tender API returned ${response.status}`);
      return results;
    }

    const data = await response.json() as any;
    const releases = data?.releases || [];

    for (const release of releases) {
      const tender = release.tender || {};
      const buyer = release.buyer || {};
      const value = tender.value || {};
      const deadline = tender.tenderPeriod?.endDate;
      const now = new Date();
      const deadlineDate = deadline ? new Date(deadline) : null;
      const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      // Skip closed tenders
      if (status === "open" && (!deadlineDate || deadlineDate <= now)) continue;

      const noticeId = tender.id || release.id || "";
      const sourceUrl = noticeId
        ? `https://www.find-tender.service.gov.uk/Notice/${noticeId}`
        : `https://www.find-tender.service.gov.uk/Search?Keywords=${encodeURIComponent(tender.title || "")}`;

      results.push({
        id: `fat-${noticeId}`,
        source: "Find a Tender",
        title: tender.title || "",
        description: tender.description || "",
        buyer: buyer.name || "Not specified",
        country: "UK",
        status: deadlineDate && deadlineDate > now ? "OPEN" : "CLOSED",
        deadline: deadline || null,
        daysLeft,
        budget: value.amount || null,
        currency: value.currency || "GBP",
        location: "",
        source_url: sourceUrl,
        published_date: release.date ? release.date.split("T")[0] : "",
      });
    }
  } catch (err: any) {
    console.error(`Find a Tender error for "${keyword}":`, err.message);
  }

  return results;
}
