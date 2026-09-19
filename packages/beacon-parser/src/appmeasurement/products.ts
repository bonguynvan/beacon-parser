import type { ProductEntry } from "../types.js";
import { parseEventToken } from "./events.js";

/**
 * Parses the AppMeasurement `products` param: a `,`-separated list of
 * entries, each `;`-delimited as category;name;quantity;price;events;eVars.
 * Unlike the top-level `events` param (comma-separated), events and eVars
 * *within* a product entry are pipe-separated — commas are already spoken
 * for as the product delimiter. Any of the five fields may be empty;
 * trailing fields may be omitted entirely.
 */
export function parseProducts(raw: string | undefined): ProductEntry[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(parseProductEntry);
}

function parseProductEntry(entry: string): ProductEntry {
  const fields = entry.split(";");
  const [category, name, quantityRaw, priceRaw, eventsRaw, eVarsRaw] = fields;

  const product: ProductEntry = {
    events: parseProductEvents(eventsRaw),
    eVars: parseMerchandisingEVars(eVarsRaw)
  };

  if (category) product.category = category;
  if (name) product.name = name;

  const quantity = Number(quantityRaw);
  if (quantityRaw !== undefined && quantityRaw !== "" && Number.isFinite(quantity)) {
    product.quantity = quantity;
  }

  const price = Number(priceRaw);
  if (priceRaw !== undefined && priceRaw !== "" && Number.isFinite(price)) {
    product.price = price;
  }

  return product;
}

function parseProductEvents(raw: string | undefined) {
  if (!raw) return [];

  return raw
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(parseEventToken);
}

function parseMerchandisingEVars(raw: string | undefined): Record<string, string> {
  const eVars: Record<string, string> = {};
  if (!raw) return eVars;

  for (const pair of raw.split("|")) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;

    const key = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    const numMatch = /^evar(\d+)$/i.exec(key);
    if (numMatch?.[1]) {
      eVars[numMatch[1]] = value;
    }
  }

  return eVars;
}
