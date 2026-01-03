// js/app.js
import {
    ADMIN_CREDENTIALS,
    fetchMenuData,
    flattenMenu,
    formatEuro,
    getAdminState,
    getCart,
    getCartCount,
    getDishOfDay,
    normalizeCode,
    saveDishOfDay,
    setAdminState,
    setCart,
    safeText,
    upsertCartItem
} from "./common.js";

const menuRoot = document.getElementById("menuRoot");
const dishOfDayRoot = document.getElementById("dishOfDay");
const pageMessage = document.getElementById("pageMessage");

const cartButton = document.getElementById("cartButton");
const cartCount = document.getElementById("cartCount");

const filterVeggie = document.getElementById("filterVeggie");
const sortMode = document.getElementById("sortMode");
const searchQuery = document.getElementById("searchQuery");

const adminButton = document.getElementById("adminButton");
const adminModal = document.getElementById("adminModal");
const adminUser = document.getElementById("adminUser");
const adminPass = document.getElementById("adminPass");
const adminMessage = document.getElementById("adminMessage");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const editDishOfDayButton = document.getElementById("editDishOfDayButton");
const dishModal = document.getElementById("dishModal");
const dishPick = document.getElementById("dishPick");
const dishName = document.getElementById("dishName");
const dishCategory = document.getElementById("dishCategory");
const dishPrice = document.getElementById("dishPrice");
const dishVeggie = document.getElementById("dishVeggie");
const dishDesc = document.getElementById("dishDesc");
const dishMax = document.getElementById("dishMax");
const dishEditMessage = document.getElementById("dishEditMessage");
const saveDishButton = document.getElementById("saveDishButton");

let menuData = null;
let allItems = [];
let itemsByCategory = new Map();

init();

async function init() {
    try {
        menuData = await fetchMenuData();
        allItems = flattenMenu(menuData);
        buildCategoryMap(allItems);

        updateCartBadge();
        renderDishOfDay();
        hydrateDishPicker();
        renderMenu();

        wireEvents();
        updateAdminUi();
    } catch (err) {
        showMessage(pageMessage, "Kon menu niet laden. Controleer of je via een lokale server draait.", "bad");
        console.error(err);
    }
}

function buildCategoryMap(items) {
    itemsByCategory = new Map();
    for (const item of items) {
        const list = itemsByCategory.get(item.category) || [];
        list.push(item);
        itemsByCategory.set(item.category, list);
    }
}

function wireEvents() {
    cartButton.addEventListener("click", () => {
        // Extra pagina (uitbreiding): cart.html
        window.location.href = "./cart.html";
    });

    filterVeggie.addEventListener("change", renderMenu);
    sortMode.addEventListener("change", renderMenu);
    searchQuery.addEventListener("input", debounce(renderMenu, 150));

    adminButton.addEventListener("click", () => {
        adminMessage.textContent = "";
        adminModal.showModal();
    });

    adminLoginButton.addEventListener("click", onAdminLogin);
    adminLogoutButton.addEventListener("click", () => {
        setAdminState(false);
        updateAdminUi();
        showMessage(adminMessage, "Uitgelogd.", "ok");
    });

    editDishOfDayButton.addEventListener("click", () => {
        dishEditMessage.textContent = "";
        dishModal.showModal();
    });

    dishPick.addEventListener("change", () => {
        const id = dishPick.value;
        const found = allItems.find((x) => x.id === id);
        if (found) fillDishFormFromItem(found);
    });

    saveDishButton.addEventListener("click", onSaveDishOfDay);
}

function updateCartBadge() {
    const count = getCartCount();
    cartCount.textContent = String(count);
}

function renderDishOfDay() {
    const payload = getDishOfDay(menuData);

    // Resolve payload
    let viewModel = null;
    if (!payload) {
        viewModel = {
            name: "Geen gerecht van de dag ingesteld",
            description: "Admin kan dit instellen.",
            price: 0,
            isVeggie: false,
            category: "—",
            maxQty: 1,
            id: null
        };
    } else if (payload.source === "menu") {
        const found = allItems.find((x) => x.id === payload.id);
        if (found) viewModel = found;
    } else if (payload.source === "custom") {
        viewModel = { ...payload };
    }

    if (!viewModel) {
        dishOfDayRoot.innerHTML = `
      <p class="muted">Kon gerecht van de dag niet resolven.</p>
    `;
        return;
    }

    const veggieBadge = viewModel.isVeggie ? `<span class="badge badge--veggie">🌿 Veggie</span>` : "";
    const dealBadge = `<span class="badge badge--deal">⭐ In de kijker</span>`;

    dishOfDayRoot.innerHTML = `
    <div class="card" style="background: rgba(0,0,0,.12);">
      <div class="card__head">
        <div>
          <h4 class="card__title">${safeText(viewModel.name)}</h4>
          <p class="card__desc">${safeText(viewModel.description || "")}</p>
        </div>
        <div class="card__price">${formatEuro(viewModel.price || 0)}</div>
      </div>
      <div class="card__meta">
        ${dealBadge}
        ${veggieBadge}
        <span class="badge">🍽️ ${safeText(viewModel.category || "—")}</span>
        <span class="badge">Max: ${Number(viewModel.maxQty || 1)}</span>
      </div>
      <div>
        ${
        viewModel.id
            ? `<button class="btn btn--primary" data-add="${safeText(viewModel.id)}">Toevoegen</button>`
            : `<span class="muted">Geen menu-item beschikbaar.</span>`
    }
      </div>
    </div>
  `;

    const addBtn = dishOfDayRoot.querySelector("[data-add]");
    if (addBtn) {
        addBtn.addEventListener("click", () => onAddToCart(viewModel.id));
    }
}

function hydrateDishPicker() {
    dishPick.innerHTML = `
    <option value="">— Kies —</option>
    ${allItems
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => `<option value="${safeText(item.id)}">${safeText(item.name)} (${safeText(item.category)})</option>`)
        .join("")}
  `;
}

function renderMenu() {
    const filterValue = filterVeggie.value;
    const sortValue = sortMode.value;
    const q = normalizeCode(searchQuery.value).toLowerCase();

    const categories = Array.from(itemsByCategory.keys());

    const categoryBlocks = categories.map((categoryName) => {
        let items = (itemsByCategory.get(categoryName) || []).slice();

        // Filter veggie
        if (filterValue === "veggie") items = items.filter((x) => x.isVeggie === true);
        if (filterValue === "non-veggie") items = items.filter((x) => x.isVeggie === false);

        // Search
        if (q) {
            items = items.filter((x) => {
                const hay = `${x.name} ${x.description} ${x.category}`.toLowerCase();
                return hay.includes(q);
            });
        }

        // Sort within category
        items.sort((a, b) => sortItems(a, b, sortValue));

        if (items.length === 0) return "";

        const grid = items.map(renderItemCard).join("");

        return `
      <section class="category">
        <h4 class="category__title">
          <span>${safeText(categoryName)}</span>
          <span class="badge">${items.length} items</span>
        </h4>
        <div class="category__grid">
          ${grid}
        </div>
      </section>
    `;
    });

    menuRoot.innerHTML = categoryBlocks.join("");

    // Hook up buttons
    menuRoot.querySelectorAll("[data-add]").forEach((btn) => {
        btn.addEventListener("click", () => onAddToCart(btn.dataset.add));
    });
}

function renderItemCard(item) {
    const veggieBadge = item.isVeggie ? `<span class="badge badge--veggie">🌿 Veggie</span>` : "";
    const optionsBadge =
        item.options && item.options.length > 0 ? `<span class="badge">⚙️ Opties</span>` : "";

    return `
    <article class="card">
      <div class="card__head">
        <div>
          <h5 class="card__title">${safeText(item.name)}</h5>
          <p class="card__desc">${safeText(item.description || "")}</p>
        </div>
        <div class="card__price">${formatEuro(item.price)}</div>
      </div>

      <div class="card__meta">
        ${veggieBadge}
        ${optionsBadge}
        <span class="badge">Max: ${Number(item.maxQty || 1)}</span>
      </div>

      <button class="btn btn--primary" data-add="${safeText(item.id)}">Toevoegen</button>
    </article>
  `;
}

function onAddToCart(itemId) {
    const item = allItems.find((x) => x.id === itemId);
    if (!item) return;

    const cart = getCart();
    const result = upsertCartItem(cart, itemId, 1, Number(item.maxQty || 1));

    setCart(result.cart);
    updateCartBadge();

    if (result.limited) {
        showMessage(
            pageMessage,
            `Maximum bereikt: je kan maximaal ${Number(item.maxQty || 1)}x “${item.name}” toevoegen.`,
            "warn"
        );
    } else {
        showMessage(pageMessage, `Toegevoegd: “${item.name}”.`, "ok");
    }
}

function sortItems(a, b, sortValue) {
    if (sortValue === "price-asc") return a.price - b.price;
    if (sortValue === "price-desc") return b.price - a.price;
    if (sortValue === "name-asc") return a.name.localeCompare(b.name);
    if (sortValue === "name-desc") return b.name.localeCompare(a.name);
    return 0;
}

function showMessage(el, text, type) {
    el.textContent = text || "";
    el.classList.remove("notice--ok", "notice--bad", "notice--warn");
    if (type === "ok") el.classList.add("notice--ok");
    if (type === "bad") el.classList.add("notice--bad");
    if (type === "warn") el.classList.add("notice--warn");
}

function updateAdminUi() {
    const { isAdmin } = getAdminState();
    editDishOfDayButton.classList.toggle("hidden", !isAdmin);

    adminLoginButton.classList.toggle("hidden", isAdmin);
    adminLogoutButton.classList.toggle("hidden", !isAdmin);

    if (isAdmin) {
        showMessage(adminMessage, "Je bent ingelogd als admin.", "ok");
    }
}

function onAdminLogin() {
    const u = String(adminUser.value || "").trim();
    const p = String(adminPass.value || "");

    if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
        setAdminState(true);
        updateAdminUi();
        showMessage(adminMessage, "Login OK. Admin-tools zijn zichtbaar.", "ok");
        adminUser.value = "";
        adminPass.value = "";
    } else {
        setAdminState(false);
        updateAdminUi();
        showMessage(adminMessage, "Ongeldige gegevens.", "bad");
    }
}

function fillDishFormFromItem(item) {
    dishName.value = item.name || "";
    dishCategory.value = item.category || "";
    dishPrice.value = String(item.price ?? "");
    dishVeggie.value = String(Boolean(item.isVeggie));
    dishDesc.value = item.description || "";
    dishMax.value = String(item.maxQty || 1);
}

function onSaveDishOfDay() {
    // If dropdown selected: store source menu, else store custom
    const pickedId = String(dishPick.value || "").trim();

    const name = String(dishName.value || "").trim();
    const category = String(dishCategory.value || "").trim();
    const price = Number(dishPrice.value);
    const isVeggie = String(dishVeggie.value) === "true";
    const description = String(dishDesc.value || "").trim();
    const maxQty = Math.max(1, Number(dishMax.value || 1));

    if (pickedId) {
        saveDishOfDay({ source: "menu", id: pickedId });
        renderDishOfDay();
        showMessage(dishEditMessage, "Opgeslagen (bestaand gerecht).", "ok");
        showMessage(pageMessage, "Gerecht van de dag aangepast.", "ok");
        return;
    }

    if (!name || !category || !Number.isFinite(price)) {
        showMessage(dishEditMessage, "Vul minstens naam, categorie en prijs correct in.", "bad");
        return;
    }

    saveDishOfDay({
        source: "custom",
        name,
        category,
        price,
        isVeggie,
        description,
        maxQty
    });

    renderDishOfDay();
    showMessage(dishEditMessage, "Opgeslagen (custom gerecht).", "ok");
    showMessage(pageMessage, "Gerecht van de dag aangepast.", "ok");
}

function debounce(fn, ms) {
    let t = null;
    return (...args) => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), ms);
    };
}
