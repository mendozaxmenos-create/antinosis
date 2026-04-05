/**
 * Cotización oficial USD (ARS por 1 USD) vía API pública del BCRA
 * (`tipoCotizacion` del código USD en /estadisticascambiarias/v1.0/Cotizaciones?fecha=).
 * Es la referencia de mercado que suelen alinear bancos (incl. Banco Nación) para tarjetas.
 */

type BcraCotizacionesJson = {
  status: number;
  results?: {
    fecha: string | null;
    detalle?: { codigoMoneda: string; tipoCotizacion: number }[];
  };
};

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchUsdRateForDate(ymd: string): Promise<number | null> {
  const url = `https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones?fecha=${encodeURIComponent(ymd)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as BcraCotizacionesJson;
  if (json.status !== 200 || !json.results?.detalle?.length) return null;
  const usd = json.results.detalle.find((x) => x.codigoMoneda === "USD");
  const v = usd?.tipoCotizacion;
  if (v == null || !Number.isFinite(v) || v <= 0) return null;
  return v;
}

/**
 * ARS por 1 USD. Si el día no tiene cotización (fin de semana / feriado), retrocede hasta 10 días.
 */
export async function getUsdArsRateBcraOfficial(transactionDate: Date): Promise<{
  rate: number;
  rateDate: string;
}> {
  const start = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate(), 12, 0, 0, 0);

  for (let back = 0; back <= 10; back++) {
    const d = new Date(start);
    d.setDate(d.getDate() - back);
    const ymd = formatYmd(d);
    const rate = await fetchUsdRateForDate(ymd);
    if (rate != null) {
      return { rate, rateDate: ymd };
    }
  }

  throw new Error(
    "No se pudo obtener la cotización USD oficial (BCRA) para la fecha del consumo. Probá de nuevo más tarde o importá el CSV.",
  );
}
