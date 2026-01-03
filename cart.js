// js/cart.js
import {
    computeLineBasePrice,
    computeOptionsPrice,
    fetchMenuData,
    flattenMenu,
    formatEuro,
    getCart,
    getPromoState,
    normalizeCode,
    setCart,
    setPromoState,
    upsertCartItem
} from "./common.js";

const cartItemsRoot = document.getElementById("cartItems");
const cartMessage = document.getElementById("cartMessage");

const promoCodeInput = document.getElementById("promoCode");
const applyPromoBtn = document.getElementById("applyPromo");
const promoFeedback = document.getElementById("promoFeedback");

const subTotalEl = document.getElementById("subTotal");
const discountEl = document.getElementById("discount");
const grandTotalEl = document.getElementById("grandTotal");

const placeOrderBtn = document.getElementById("placeOrder");
const clearCartBtn = document.getElementById("clearCart");

let menuData = null;
let allItems = [];
let appliedPromo = null; // {code, percent, oneTime}

init();

async function init() {
    try {
        menuData = await fetchMenuData();
        allItems = flattenMenu(menuData);

        render();
        wireEvents();
    } catch (err) {
        show(cartMessage, "Kon menu niet laden. Start via een lokale server.", "bad");
        console.error(err);
    }
}

function wireEvents() {
    applyPromoBtn.addEventListener("click", () => {
        const code = normalizeCode(promoCodeInput.value);
        applyPromo(code);
        renderTotals();
    });

    placeOrderBtn.addEventListener("click", () => {
        const cart = getCart();
        if (cart.length === 0) {
            show(cartMessage, "Je winkelmand is leeg.", "warn");
            return;
        }

        // Remove one-time code from promo array if applied
        if (appliedPromo && appliedPromo.oneTime) {
            const promoState = getPromoState();
            const nextCodes = promoState.codes.filter((c) => normalizeCode(c.code) !== normalizeCode(appliedPromo.code));
            promoState.codes = nextCodes;
            promoState.removedOneTime.push(appliedPromo.code);
            setPromoState(promoState);
        }

        // "Complete" order: clear cart
        setCart([]);
        appliedPromo = null;
        promoCodeInput.value = "";
        show(promoFeedback, "", null);

        render();

        alert("Bestelling geplaatst! (Simulatie)\nBedankt 🍜");
    });

    clearCartBtn.addEventListener("click", () => {
        setCart([]);
        appliedPromo = null;
        promoCodeInput.value = "";
        show(promoFeedback, "", null);
        render();
        show(cartMessage, "Winkelmand leeggemaakt.", "ok");
    });
}

function render() {
    const cart = getCart();

    if (cart.length === 0) {
        cartItemsRoot.innerHTML = `
      <div class="panel">
        <p class="muted">Je winkelmand is leeg. Ga terug naar het menu om items toe te voegen.</p>
        <a class="btn btn--primary" href="./index.html">Naar menu</a>
      </div>
    `;
        renderTotals();
        return;
    }

    cartItemsRoot.innerHTML = cart.map(renderCartItem).join("");

    // Attach events (qty +/- + remove + options)
    cartItemsRoot.querySelectorAll("[data-inc]").forEach((btn) => {
        btn.addEventListener("click", () => changeQty(btn.dataset.inc, +1));
    });
    cartItemsRoot.querySelectorAll("[data-dec]").forEach((btn) => {
        btn.addEventListener("click", () => changeQty(btn.dataset.dec, -1));
    });
    cartItemsRoot.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () => removeItem(btn.dataset.remove));
    });

    cartItemsRoot.querySelectorAll("[data-opt]").forEach((input) => {
        input.addEventListener("change", () => {
            const itemId = input.dataset.item;
            const optKey = input.dataset.opt;
            const checked = input.checked;
            toggleOption(itemId, optKey, checked);
            renderTotals();
        });
    });

    renderTotals();
}

function renderCartItem(line) {
    const item = allItems.find((x) => x.id === line.id);
    if (!item) return "";

    const maxQty = Number(item.maxQty || 1);
    const qty = Number(line.qty || 0);

    const optionsUi = renderOptions(item, line.options || []);

    const lineBase = computeLineBasePrice(item, qty);
    const optionsPerUnit = computeOptionsPrice(item, line.options || []);
    const lineTotal = lineBase + optionsPerUnit * qty;

    const veggieBadge = item.isVeggie ? `<span class="badge badge--veggie">🌿 Veggie</span>` : "";

    return `
    <article class="cart-item">
      <div class="cart-item__top">
        <div>
          <h4 class="cart-item__title">${escapeHtml(item.name)}</h4>
          <p class="cart-item__sub">${escapeHtml(item.category)} • ${formatEuro(item.price)} / stuk</p>
          <div class="card__meta">
            ${veggieBadge}
            <span class="badge">Max: ${maxQty}</span>
            <span class="badge">Lijn: ${formatEuro(lineTotal)}</span>
          </div>
        </div>

        <button class="btn btn--ghost" type="button" data-remove="${escapeHtml(item.id)}">🗑️</button>
      </div>

      <div class="cart-item__actions">
        <div class="qty" aria-label="Aantal aanpassen">
          <button class="btn btn--ghost" type="button" data-dec="${escapeHtml(item.id)}">−</button>
          <strong>${qty}</strong>
          <button class="btn btn--ghost" type="button" data-inc="${escapeHtml(item.id)}">+</button>
        </div>

        <span class="muted small">Max ${maxQty} per gerecht</span>
      </div>

      ${optionsUi}
    </article>
  `;
}

function renderOptions(item, selected) {
    if (!item.options || item.options.length === 0) {
        return `<p class="muted small">Geen extra’s/omits voor dit gerecht.</p>`;
    }

    const selectedSet = new Set(selected || []);

    const optionsHtml = item.options.map((opt) => {
        const isChecked = selectedSet.has(opt.key);
        const priceText = opt.type === "extra" ? `(+${formatEuro(opt.price || 0)}/stuk)` : "(omit)";
        return `
      <label class="badge" style="cursor:pointer;">
        <input
          type="checkbox"
          data-opt="1"
          data-item="${escapeHtml(item.id)}"
          data-opt="${escapeHtml(opt.key)}"
          ${isChecked ? "checked" : ""}
          style="margin-right:8px;"
        />
        ${escapeHtml(opt.label)} <span class="muted">${escapeHtml(priceText)}</span>
      </label>
    `;
    }).join("");

    return `
    <div class="panel" style="margin-top:8px;">
      <p class="muted small" style="margin-top:0;">Opties per gerecht (prijs wordt herberekend):</p>
      <div class="card__meta" style="gap:10px;">
        ${optionsHtml}
      </div>
    </div>
  `;
}

function changeQty(itemId, delta) {
    const cart = getCart();
    const item = allItems.find((x) => x.id === itemId);
    if (!item) return;

    const result = upsertCartItem(cart, itemId, delta, Number(item.maxQty || 1));
    setCart(result.cart);

    if (result.limited) {
        show(cartMessage, `Maximum bereikt voor “${item.name}”.`, "warn");
    } else {
        show(cartMessage, "", null);
    }

    render();
}

function removeItem(itemId) {
    const cart = getCart();
    const next = cart.filter((x) => x.id !== itemId);
    setCart(next);
    render();
}

function toggleOption(itemId, optKey, checked) {
    const cart = getCart();
    const idx = cart.findIndex((x) => x.id === itemId);
    if (idx === -1) return;

    const line = cart[idx];
    const set = new Set(line.options || []);
    if (checked) set.add(optKey);
    else set.delete(optKey);

    line.options = Array.from(set);
    cart[idx] = line;
    setCart(cart);
}

function applyPromo(code) {
    const promoState = getPromoState();
    const found = promoState.codes.find((c) => normalizeCode(c.code) === code);

    if (!code) {
        appliedPromo = null;
        show(promoFeedback, "Geen code ingegeven.", "warn");
        return;
    }

    if (!found) {
        appliedPromo = null;
        show(promoFeedback, "Ongeldige code.", "bad");
        return;
    }

    appliedPromo = found;
    show(
        promoFeedback,
        `Code geldig: ${found.code} (${Math.round(found.percent * 100)}% korting)${found.oneTime ? " • one-time" : ""}`,
        "ok"
    );
}

function renderTotals() {
    const cart = getCart();

    let subTotal = 0;
    for (const line of cart) {
        const item = allItems.find((x) => x.id === line.id);
        if (!item) continue;

        const qty = Number(line.qty || 0);
        const base = computeLineBasePrice(item, qty);
        const optPerUnit = computeOptionsPrice(item, line.options || []);
        subTotal += base + optPerUnit * qty;
    }

    let discount = 0;
    if (appliedPromo) discount = subTotal * appliedPromo.percent;

    const grand = Math.max(0, subTotal - discount);

    subTotalEl.textContent = formatEuro(subTotal);
    discountEl.textContent = formatEuro(discount);
    grandTotalEl.textContent = formatEuro(grand);
}

function show(el, text, type) {
    el.textContent = text || "";
    el.classList.remove("notice--ok", "notice--bad", "notice--warn");
    if (type === "ok") el.classList.add("notice--ok");
    if (type === "bad") el.classList.add("notice--bad");
    if (type === "warn") el.classList.add("notice--warn");
}

function escapeHtml(text) {
    return String(text || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
