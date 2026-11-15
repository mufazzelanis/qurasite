/**
 * Shared cart pricing (used by the browser for display AND the server for the
 * real charge — the server always recalculates from DB prices).
 *
 * Combo rule: an add-on product (honey, jaggery…) gets its `comboPrice`
 * when the cart also contains at least one main (non add-on) product.
 */
export type PricedProduct = {
  id: string;
  price: number;
  isAddon: boolean;
  comboPrice: number | null;
};

export function priceCart<P extends PricedProduct>(lines: { product: P; quantity: number }[]) {
  const hasMain = lines.some((l) => !l.product.isAddon);
  let subtotal = 0;
  let comboSavings = 0;
  const items = lines.map((l) => {
    const combo = l.product.isAddon && hasMain && l.product.comboPrice != null && l.product.comboPrice < l.product.price;
    const unit = combo ? l.product.comboPrice! : l.product.price;
    subtotal += unit * l.quantity;
    if (combo) comboSavings += (l.product.price - unit) * l.quantity;
    return { product: l.product, quantity: l.quantity, unit, combo };
  });
  return { items, subtotal, comboSavings, hasMain };
}

export function deliveryFor(
  area: "INSIDE_DHAKA" | "SUB_DHAKA" | "OUTSIDE_DHAKA",
  subtotal: number,
  d: { insideDhaka: number; subDhaka: number; outsideDhaka: number; freeDeliveryOver: number },
) {
  if (d.freeDeliveryOver && subtotal >= d.freeDeliveryOver) return 0;
  return { INSIDE_DHAKA: d.insideDhaka, SUB_DHAKA: d.subDhaka, OUTSIDE_DHAKA: d.outsideDhaka }[area];
}
