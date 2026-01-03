# SeaSalt Takeaway — Schoolopdracht

## Opstarten
Deze site gebruikt `fetch()` om `data/menu.json` te laden. Daarom moet je dit project via een lokale server draaien:

### Optie A: VS Code Live Server
- Installeer “Live Server”
- Rechtsklik `index.html` → “Open with Live Server”

### Optie B: Node (http-server)
- `npm i -g http-server`
- in de projectmap: `http-server`
- open de getoonde URL

## Functionaliteiten (minimale vereisten)
- Dynamische weergave van gerechten via JSON (`data/menu.json`)
- Veggie-items visueel onderscheiden (🌿 badge)
- Gerecht van de dag bovenaan in de kijker (⭐)
- Filter veggie/non-veggie + zoekfunctie
- Sorteren op prijs/naam binnen categorieën
- Toevoegen aan winkelmand: meerdere klikken verhogen aantal, geen duplicaten (qty per item)
- Max per gerecht: bij overschrijding melding via DOM en qty wordt niet hoger
- Winkelmand knop: leidt naar cart.html (uitbreiding) en toont overzicht + totaal

## Extra uitbreidingen
1. Data uit JSON via Fetch (`fetchMenuData()` in `js/common.js`)
2. Admin login (hardcoded in `js/common.js`):
    - username: `admin`
    - password: `SeaSalt123!`
3. Alleen admin:
    - “Gerecht van de dag aanpassen” (✏️) zichtbaar
    - keuze bestaand gerecht of custom gerecht
    - opslag in localStorage
4. Promocodes:
    - codes in array (en opgeslagen in localStorage state)
    - validatie met visuele feedback
    - one-time codes worden verwijderd na “Bestelling plaatsen” (simulatie)
5. Contactformulier:
    - client-side validatie met foutmeldingen in de HTML (geen alert)
    - extra rules voor onderwerp “Boeking”
6. Extra pagina winkelmand:
    - cart.html toont items, qty controls, totaalprijs, korting
7. Extra’s/Omit:
    - opties per item via `options` veld in dataset
    - keuzes beïnvloeden dynamisch de totaalprijs
    - gekozen opties worden bewaard in localStorage in cart lines

## localStorage keys
- `ss_cart_v1` → array met cart lines `{ id, qty, options }`
- `ss_dish_of_day_v1` → object `{ source:"menu", id }` of `{ source:"custom", ... }`
- `ss_admin_v1` → `{ isAdmin: boolean }`
- `ss_promo_state_v1` → `{ codes: [...], removedOneTime: [...] }`

## Naming conventions
- JS: camelCase voor variabelen/functies (`renderMenu`, `applyPromo`)
- CSS: kebab-case classes (`menu-root`, `badge--veggie`)
- Bestanden: kebab-case of duidelijke namen (`styles.css`, `menu.json`)
