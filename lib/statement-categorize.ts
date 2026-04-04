/**
 * Primera versión: reglas por palabras clave sobre descripción + comercio.
 * Devuelve el nombre de categoría (debe existir en la tabla Category).
 */
const RULES: { category: string; patterns: RegExp[] }[] = [
  { category: "Supermarket", patterns: [/supermarket|supermercado|grocery|walmart|carrefour|coto|día|dia|jumbo|vital/i] },
  { category: "Fuel", patterns: [/shell|ypf|axion|esso|fuel|combustible|gasolina|petrol|estacion/i] },
  { category: "Pharmacy", patterns: [/farmacia|pharmacy|drugstore|farma/i] },
  { category: "Health", patterns: [/hospital|clinic|salud|medical|doctor|obra social/i] },
  { category: "Delivery", patterns: [/delivery|rappi|pedidos|uber\s*eats|glovo|ifood/i] },
  { category: "Streaming", patterns: [/netflix|spotify|hbo|disney|youtube|prime video|streaming/i] },
  { category: "Education", patterns: [/course|curso|edu|universidad|university|udemy/i] },
  { category: "Clothing", patterns: [/zara|h&m|clothing|ropa|indumentaria|fashion/i] },
  { category: "Travel", patterns: [/airline|aerolinea|hotel|booking|despegar|airbnb|viaje/i] },
  { category: "Entertainment", patterns: [/cinema|cine|teatro|ticket|show|event/i] },
  { category: "Home", patterns: [/home|hogar|furniture|muebles|easy|sodimac|ferreter/i] },
  { category: "Services", patterns: [/service|servicio|insurance|seguro|utilities/i] },
  { category: "Taxes", patterns: [/tax|impuesto|afip|monotributo|arba/i] },
];

export function categorizeFromText(description: string, merchant: string): string {
  const text = `${description} ${merchant}`.trim();
  if (!text) return "Other";
  for (const { category, patterns } of RULES) {
    for (const re of patterns) {
      if (re.test(text)) return category;
    }
  }
  return "Other";
}
