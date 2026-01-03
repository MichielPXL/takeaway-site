// js/common.js
// Shared helpers, state, fetch, storage, formatting, admin credentials, promo codes

export const STORAGE_KEYS = {
    cart: "ss_cart_v1",
    dishOfDay: "ss_dish_of_day_v1",
    admin: "ss_admin_v1",
    promoState: "ss_promo_state_v1"
};

// Admin credentials (ONLY for this school assignment)
export const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "SeaSalt123!"
};

export const PROMO_CODES_DEFAULT = [
    // percent: 0.10 means 10%
    { code: "WELCOME10", percent: 0.10, oneTime: true },
    { code: "STUDENT5", percent: 0.05, oneTime: false },
    { code: "PASTA15", percent: 0.15, oneTime: true }
];

export function formatEuro(value) {
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString("nl-BE", { style: "currency", currency: "EUR" });
}

export function readStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getAdminState() {
    return readStorage(STORAGE_KEYS.admin, { isAdmin: false });
}

export function setAdminState(isAdmin) {
    writeStorage(STORAGE_KEYS.admin, { isAdmin: Boolean(isAdmin) });
}

export async function fetchMenuData() {
    const response = await fetch("./data/menu.json");
    if (!response.ok) throw new Error("Kon menu.json niet laden.");
    return response.json();
}

export function flattenMenu(menuData) {
    const all = [];
    for (const category of menuData.categories) {
        for (const item of category.items) {
            all.push({ ...item, category: category.name });
        }
    }
    return all;
}

// Cart shape: [{ id: string, qty: number, options: string[] }]
export function getCart() {
    return readStorage(STORAGE_KEYS.cart, []);
}

export function setCart(cart) {
    writeStorage(STORAGE_KEYS.cart, cart);
}

export function getCartCount() {
    return getCart().reduce((sum, line) => sum + (line.qty || 0), 0);
}

export function upsertCartItem(cart, itemId, deltaQty, maxQty) {
    const newCart = [...cart];
    const existingIndex = newCart.findIndex((x) => x.id === itemId);

    if (existingIndex === -1) {
        const nextQty = Math.max(0, deltaQty);
        if (nextQty === 0) return { cart: newCart, changed: false, limited: false };
        const limited = nextQty > maxQty;
        newCart.push({ id: itemId, qty: Math.min(nextQty, maxQty), options: [] });
        return { cart: newCart, changed: true, limited };
    }

    const existing = newCart[existingIndex];
    const nextQty = (existing.qty || 0) + deltaQty;

    if (nextQty <= 0) {
        newCart.splice(existingIndex, 1);
        return { cart: newCart, changed: true, limited: false };
    }

    const limited = nextQty > maxQty;
    existing.qty = Math.min(nextQty, maxQty);
    newCart[existingIndex] = existing;

    return { cart: newCart, changed: true, limited };
}

export function getDishOfDay(menuData) {
    // stored dish can be:
    // - { source:"menu", id:"..." }
    // - { source:"custom", name, description, price, isVeggie, category, maxQty }
    const stored = readStorage(STORAGE_KEYS.dishOfDay, null);
    const fallback = menuData.defaultDishOfDay || null;
    return stored || fallback;
}

export function saveDishOfDay(dishOfDayPayload) {
    writeStorage(STORAGE_KEYS.dishOfDay, dishOfDayPayload);
}

export function getPromoState() {
    // Keep promo codes array and "removed" one-time codes here
    return readStorage(STORAGE_KEYS.promoState, {
        codes: PROMO_CODES_DEFAULT,
        removedOneTime: []
    });
}

export function setPromoState(state) {
    writeStorage(STORAGE_KEYS.promoState, state);
}

export function normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
}

export function computeLineBasePrice(item, qty) {
    return (item.price || 0) * qty;
}

export function computeOptionsPrice(item, selectedOptions) {
    if (!item.options || item.options.length === 0) return 0;
    const set = new Set(selectedOptions || []);
    let total = 0;
    for (const opt of item.options) {
        if (set.has(opt.key) && opt.type === "extra") total += (opt.price || 0);
    }
    // omit has price 0 in this dataset; kept for completeness
    return total;
}

export function safeText(text) {
    // Minimal safety for dynamic HTML injection
    return String(text || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
