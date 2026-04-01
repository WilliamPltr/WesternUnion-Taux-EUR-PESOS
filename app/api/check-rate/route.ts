import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { EUR_ARS_THRESHOLD } from "@/lib/eur-ars-threshold";
import { getWesternUnionEurArsRate } from "@/lib/westernunion-rate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseQuoteEur(): number {
  const raw = process.env.WU_QUOTE_EUR_AMOUNT?.trim();
  const n = raw ? Number(raw) : 100;
  return Number.isFinite(n) && n > 0 ? n : 100;
}

/** Heure Argentine (UTC−3), 24 h type 17h30. */
function formatArgentinaDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}h${get("minute")} (UTC−3)`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const threshold = EUR_ARS_THRESHOLD;

  let rate: number;
  let sendAmountEur: number;
  try {
    const quoteEur = parseQuoteEur();
    const result = await getWesternUnionEurArsRate(quoteEur);
    rate = result.rate;
    sendAmountEur = result.sendAmountEur;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to fetch Western Union rate", detail: message },
      { status: 502 },
    );
  }

  const alerted = rate > threshold;

  if (alerted) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM?.trim();
    const to = process.env.ALERT_EMAIL?.trim();

    if (!apiKey || !from || !to) {
      return NextResponse.json(
        {
          error:
            "Rate exceeded threshold but Resend is not configured (RESEND_API_KEY, RESEND_FROM, ALERT_EMAIL)",
          rate,
          threshold,
          alerted: true,
        },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const when = formatArgentinaDateTime(new Date());
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: `WU EUR/ARS — taux ${rate.toFixed(4)}, seuil ${threshold}`,
      text: [
        `Taux actuel : ${rate.toFixed(4)} ARS/EUR`,
        `Seuil : ${threshold}`,
        `Date / heure : ${when}`,
      ].join("\n"),
    });

    if (error) {
      return NextResponse.json(
        {
          error: "Resend failed",
          detail: error.message,
          rate,
          threshold,
          alerted: true,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    rate,
    threshold,
    alerted,
    sendAmountEur,
    checkedAt: new Date().toISOString(),
  });
}
