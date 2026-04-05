/**
 * Primera versión: reglas por palabras clave sobre descripción + comercio.
 * Devuelve el nombre de categoría (debe existir en la tabla Category).
 */
const RULES: { category: string; patterns: RegExp[] }[] = [
  {
    category: "Supermarket",
    patterns: [
      /supermarket|supermercado|grocery|walmart|carrefour|coto|día\s*%?|dia\s*%?|jumbo|vital|disco|vea|changomas/i,
    ],
  },
  { category: "Fuel", patterns: [/shell|ypf|axion|esso|fuel|combustible|gasolina|petrol|estacion|full\s|puma\s+energy/i] },
  { category: "Pharmacy", patterns: [/farmacia|pharmacy|drugstore|farma|farmacias/i] },
  { category: "Health", patterns: [/hospital|clinic|salud|medical|doctor|obra social|swiss\s*med|osde|galeno|omint/i] },
  {
    category: "Delivery",
    patterns: [/delivery|rappi|pedidosya|pedidos\s*ya|uber\s*eats|glovo|ifood|i\s*food/i],
  },
  { category: "Streaming", patterns: [/netflix|spotify|hbo|disney|youtube|prime video|streaming|flow|paramount/i] },
  { category: "Education", patterns: [/course|curso|edu|universidad|university|udemy|platzi|coderhouse/i] },
  { category: "Clothing", patterns: [/zara|h&m|clothing|ropa|indumentaria|fashion|renner|dafiti|nike\s*store/i] },
  {
    category: "Travel",
    patterns: [/airline|aerolinea|hotel|booking|despegar|airbnb|viaje|latam|aerolineas|flybondi|jet\s*smart/i],
  },
  { category: "Entertainment", patterns: [/cinema|cine|teatro|ticket|show|event|movie/i] },
  { category: "Home", patterns: [/home|hogar|furniture|muebles|easy|sodimac|ferreter|blanco|megatone/i] },
  {
    category: "Services",
    patterns: [/service|servicio|insurance|seguro|utilities|mercado\s*pago|mercadolibre|ml\s*\+\s*|personal\s*flow|movistar|claro|telecentro/i,
    ],
  },
  { category: "Taxes", patterns: [/tax|impuesto|afip|monotributo|arba|anses|ansés/i] },
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
