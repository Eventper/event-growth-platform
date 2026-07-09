// SAM.gov API Integration — US Federal Procurement Portal
// https://open.sam.gov/
// Free API key: register at https://sam.gov/content/entity-information

function samDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export async function searchSamGov(keywords: string, limit: number = 25): Promise<any[]> {
  try {
    const apiKey = process.env.SAM_GOV_API_KEY || "";
    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1); // look back 1 year

    const params = new URLSearchParams({
      keyword: keywords,
      limit: String(limit),
      postedFrom: samDate(from),
      postedTo: samDate(now),
      status: "active",
      ...(apiKey ? { api_key: apiKey } : {}),
    });

    const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`SAM.gov responded ${response.status} for "${keywords}":`, text.slice(0, 200));
      return [];
    }

    const data = await response.json() as { opportunitiesData?: any[] };
    const opps: any[] = data.opportunitiesData || [];

    return opps
      .filter((opp: any) => {
        // Only include active/open opportunities with a future deadline
        const deadline = opp.responseDeadLine || opp.archiveDate || "";
        if (!deadline) return true;
        return new Date(deadline) > now;
      })
      .map((opp: any) => {
        const id = opp.opportunityId || opp.noticeId || "";
        const rawValue = opp.award?.amount || opp.estimatedTotalAmount || opp.baseAndAllOptionsValue || null;
        const valueNum = rawValue ? parseFloat(String(rawValue).replace(/[^0-9.]/g, "")) : null;
        const valueText = valueNum
          ? `$${valueNum >= 1_000_000 ? (valueNum / 1_000_000).toFixed(1) + "M" : valueNum >= 1_000 ? (valueNum / 1_000).toFixed(0) + "K" : valueNum.toLocaleString()}`
          : "Amount TBD";

        return {
          id,
          title: opp.title || opp.opportunityTitle || "Untitled Opportunity",
          buyer: opp.organizationHierarchy?.[0]?.name || opp.fullParentPathName || opp.agencyName || "US Federal Agency",
          description: (opp.description || opp.shortDescription || opp.synopsis || "").slice(0, 400),
          category: opp.typeOfSetAsideDescription || opp.naicsDescription || "Federal Procurement",
          value_text: valueText,
          value_amount: valueNum,
          value_currency: "USD",
          deadline: (opp.responseDeadLine || opp.archiveDate || "").split("T")[0],
          published: (opp.postedDate || "").split("T")[0],
          source: "SAM.gov",
          source_url: id ? `https://sam.gov/opp/${id}/view` : "https://sam.gov/search/?index=opp&q=" + encodeURIComponent(keywords),
          status: "Open",
          naics_code: opp.naicsCode || "",
          set_aside: opp.typeOfSetAsideDescription || "",
          notice_type: opp.type || opp.baseType || "",
        };
      });
  } catch (error: any) {
    console.error("SAM.gov search error:", error.message);
    return [];
  }
}

export async function getSamGovOpportunity(opportunityId: string) {
  try {
    const apiKey = process.env.SAM_GOV_API_KEY || "";
    const params = new URLSearchParams({
      opportunityIds: opportunityId,
      ...(apiKey ? { api_key: apiKey } : {}),
    });
    const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;

    const data = await response.json() as { opportunitiesData?: any[] };
    const opp = data.opportunitiesData?.[0];
    if (!opp) return null;

    return {
      id: opp.opportunityId,
      title: opp.title || opp.opportunityTitle,
      buyer: opp.organizationHierarchy?.[0]?.name || opp.agencyName || "US Federal Agency",
      description: opp.description || opp.synopsis,
      category: opp.typeOfSetAsideDescription || "Federal Procurement",
      value: opp.estimatedTotalAmount || 0,
      deadline: opp.responseDeadLine || opp.archiveDate,
      source: "SAM.gov",
      url: `https://sam.gov/opp/${opp.opportunityId}/view`,
      postedDate: opp.postedDate,
      naicsCode: opp.naicsCode,
      classificationCode: opp.classificationCode,
      setAside: opp.typeOfSetAsideDescription,
    };
  } catch (error: any) {
    console.error("SAM.gov details fetch error:", error.message);
    return null;
  }
}
