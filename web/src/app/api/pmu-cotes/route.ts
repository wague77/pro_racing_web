import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // YYYYMMDD
  const r = searchParams.get("r"); // e.g., 1
  const c = searchParams.get("c"); // e.g., 1

  if (!date || !r || !c) {
    return NextResponse.json({ error: "Missing parameters date, r or c" }, { status: 400 });
  }

  const pmuUrl = `https://online.turfinfo.api.pmu.fr/rest/client/1/programme/${date}/R${r}/C${c}/participants`;

  try {
    const response = await fetch(pmuUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.pmu.fr/"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Cotes indisponibles pour le moment" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("PMU Fetch Error:", error);
    return NextResponse.json({ error: "Erreur réseau avec le PMU" }, { status: 500 });
  }
}
