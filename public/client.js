let price = localStorage.getItem("vpiPrice")
    ? parseFloat(localStorage.getItem("vpiPrice"))
    : 0.156300;

// --- LOGIN SYSTEM ---
let currentUser = localStorage.getItem("vpiCurrentUser") || null;
let userLogins = localStorage.getItem("vpiUserLogins") ? JSON.parse(localStorage.getItem("vpiUserLogins")) : [];

const loginModal = document.getElementById("loginModal");
const nameInput = document.getElementById("nameInput");
const loginBtn = document.getElementById("loginBtn");
const currentUserEl = document.getElementById("currentUser");
const adminBtn = document.getElementById("adminBtn");
const adminPanel = document.getElementById("adminPanel");
const closeAdminBtn = document.getElementById("closeAdminBtn");
const loginsListEl = document.getElementById("loginsList");
const clearLoginsBtn = document.getElementById("clearLoginsBtn");

function formatLoginTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString('hu-HU');
}

function renderLogins() {
    if (!loginsListEl) return;
    if (!userLogins || userLogins.length === 0) {
        loginsListEl.innerHTML = '<div style="color: var(--muted); font-size: 13px;">Nincs bejelentkezés még</div>';
        return;
    }
    loginsListEl.innerHTML = '';
    userLogins.slice().reverse().forEach(login => {
        const div = document.createElement('div');
        div.className = 'login-item';
        div.innerHTML = `<div class="name">${login.name}</div><div class="time">${formatLoginTime(login.ts)}</div>`;
        loginsListEl.appendChild(div);
    });
}

function addLogin(name) {
    userLogins.push({ name, ts: Date.now() });
    localStorage.setItem("vpiUserLogins", JSON.stringify(userLogins));
    renderLogins();
}

function handleLogin() {
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        return;
    }
    currentUser = name;
    localStorage.setItem("vpiCurrentUser", currentUser);
    addLogin(name);
    updateUserDisplay();
    loginModal.classList.add("hidden");
    nameInput.value = '';
}

function updateUserDisplay() {
    if (currentUserEl) {
        currentUserEl.textContent = currentUser ? `👤 ${currentUser}` : '';
    }
}

// Login event listeners
if (loginBtn) loginBtn.addEventListener("click", handleLogin);
if (nameInput) nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleLogin(); });

// Admin panel toggles
if (adminBtn) adminBtn.addEventListener("click", () => {
    if (adminPanel) adminPanel.classList.toggle("open");
});

if (closeAdminBtn) closeAdminBtn.addEventListener("click", () => {
    if (adminPanel) adminPanel.classList.remove("open");
});

if (clearLoginsBtn) clearLoginsBtn.addEventListener("click", () => {
    if (confirm("Biztos? Ezt nem lehet visszavonni.")) {
        userLogins = [];
        localStorage.setItem("vpiUserLogins", JSON.stringify(userLogins));
        renderLogins();
    }
});

// Ensure login modal visibility matches stored login state
if (loginModal) {
    if (currentUser) {
        loginModal.classList.add("hidden");
    } else {
        loginModal.classList.remove("hidden");
    }
}

updateUserDisplay();
renderLogins();

let history = localStorage.getItem("vpiHistory")
    ? JSON.parse(localStorage.getItem("vpiHistory"))
    : Array(120).fill(price);

// lastPrice is persisted separately so we can show percent on reload
let lastPrice = localStorage.getItem("vpiLastPrice")
    ? parseFloat(localStorage.getItem("vpiLastPrice"))
    : price;

const priceEl = document.getElementById("price");
const changeEl = document.getElementById("change");
const percentEl = document.getElementById("percent");
const arrowEl = document.getElementById("arrow");

// Market data DOM refs and supply constants
const marketCapEl = document.getElementById("marketcap");
const volumeEl = document.getElementById("volume");
const volumePeriodEl = document.getElementById("volumePeriod");
let currentVolumePeriod = "day";
const fdvEl = document.getElementById("fdv");
const totalSupplyEl = document.getElementById("totalSupply");
const circulatingEl = document.getElementById("circulatingSupply");
const maxSupplyEl = document.getElementById("maxSupply");

const circulatingSupply = 8790000000; // 8.79B
const totalSupply = 100000000000; // 100B
const maxSupply = 100000000000; // 100B

function formatNumber(n, currency=false) {
    if (n === null || n === undefined) return "-";
    const abs = Math.abs(n);
    let out;
    if (abs >= 1e12) out = (n / 1e12).toFixed(2) + 'T';
    else if (abs >= 1e9) out = (n / 1e9).toFixed(2) + 'B';
    else if (abs >= 1e6) out = (n / 1e6).toFixed(2) + 'M';
    else out = n.toFixed(2);
    return currency ? ('$' + out) : out;
}

const chartEl = document.getElementById("chart");
const ctx = chartEl && chartEl.getContext ? chartEl.getContext('2d') : null;

if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Ensure the CDN script is present in index.html.');
}

let chart = null;
if (ctx && typeof Chart !== 'undefined') {
    chart = new Chart(ctx, {
    type: "line",
    data: {
        labels: history.map((_, i) => i),
        datasets: [{
            data: history,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0,
            fill: true,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.12)"
        }]
    },
    options: {
        animation: false, // fontos!
        plugins: { legend: { display: false } },
        scales: {
            x: { display: false },
            y: {
                ticks: { color: "#9ca3af" },
                grid: { color: "#1f2937" }
            }
        }
    }
});

// --- simple trade simulation (local only) ---
let usdBalance = localStorage.getItem("vpiUSD") ? parseFloat(localStorage.getItem("vpiUSD")) : 1000.0;
let vpiBalance = localStorage.getItem("vpiHoldings") ? parseFloat(localStorage.getItem("vpiHoldings")) : 0.0;

const usdBalanceEl = document.getElementById("usdBalance");
const vpiBalanceEl = document.getElementById("vpiBalance");
const tradeAmountEl = document.getElementById("tradeAmount");
const tradeSideEl = document.getElementById("tradeSide");
const tradeBtn = document.getElementById("tradeBtn");
const tradeMsg = document.getElementById("tradeMsg");
const buyMaxBtn = document.getElementById("buyMaxBtn");
const sellMaxBtn = document.getElementById("sellMaxBtn");
const feePercentEl = document.getElementById("feePercent");
const tradeHistoryEl = document.getElementById("tradeHistory");

const FEE_PCT = 0.002; // 0.2% fee
if (feePercentEl) feePercentEl.textContent = (FEE_PCT * 100).toFixed(2) + "%";

let tradeHistory = localStorage.getItem("vpiTradeHistory") ? JSON.parse(localStorage.getItem("vpiTradeHistory")) : [];

function updateTradeUI() {
    if (usdBalanceEl) usdBalanceEl.textContent = "$" + usdBalance.toFixed(2);
    if (vpiBalanceEl) vpiBalanceEl.textContent = vpiBalance.toFixed(4);
}

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString();
}

function renderTradeHistory() {
    if (!tradeHistoryEl) return;
    if (!tradeHistory || tradeHistory.length === 0) { tradeHistoryEl.textContent = "—"; return; }
    tradeHistoryEl.innerHTML = '';
    const list = tradeHistory.slice(0, 20);
    list.forEach(t => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<div class="left"><div class="side ${t.side}">${t.side.toUpperCase()}</div><div class="time">${formatTime(t.ts)}</div></div><div class="value">${t.amount.toFixed(4)} --> $${t.price.toFixed(4)}</div>`;
        tradeHistoryEl.appendChild(div);
    });
}

function addTradeToHistory(t) {
    tradeHistory.unshift(t);
    if (tradeHistory.length > 200) tradeHistory.pop();
    localStorage.setItem("vpiTradeHistory", JSON.stringify(tradeHistory));
    renderTradeHistory();
}

function showTradeMsg(text, error=false) {
    if (tradeMsg) {
        tradeMsg.textContent = text;
        tradeMsg.style.color = error ? "#ef4444" : "#9ca3af";
    }
}

function buyMax() {
    // compute max amount buyable considering fee
    const maxAmount = Math.floor((usdBalance / (price * (1 + FEE_PCT))) * 10000) / 10000;
    if (tradeAmountEl) tradeAmountEl.value = maxAmount > 0 ? maxAmount : '';
}

function sellMax() {
    if (tradeAmountEl) tradeAmountEl.value = vpiBalance > 0 ? Number(vpiBalance.toFixed(4)) : '';
}

// Core trade function used by manual and auto trades. Returns true on success.
function doTrade(side, amount, isAuto=false) {
    if (!amount || amount <= 0) { if (!isAuto) showTradeMsg("Adj meg egy pozitív összeget", true); return false; }

    const tradeValue = amount * price;
    const marketCap = price * circulatingSupply;
    const impactRatio = marketCap > 0 ? tradeValue / marketCap : 0;
    const PRICE_IMPACT_SCALE = 5000;

    let priceChange = price * impactRatio * PRICE_IMPACT_SCALE;
    const maxPctPerTrade = 0.05;
    const minPctPerTrade = 0.00001;
    priceChange = Math.min(priceChange, price * maxPctPerTrade);
    if (impactRatio > 0 && priceChange < price * minPctPerTrade) {
        priceChange = price * minPctPerTrade;
    }

    const oldPrice = price;

    if (side === "buy") {
        const totalCost = amount * price * (1 + FEE_PCT);
        if (usdBalance < totalCost) { if (!isAuto) showTradeMsg("Nincs elég USD a vásárláshoz (díjat is figyelembe véve)", true); return false; }
        usdBalance -= totalCost;
        vpiBalance += amount;
        price = Math.max(0.000001, price - priceChange);
        const pct = ((oldPrice - price) / oldPrice) * 100;
        const msg = `Vásárlás végrehajtva${isAuto? ' (auto)':''} — ár: -${pct.toFixed(4)}% (fee ${(FEE_PCT*100).toFixed(2)}%)`;
        showTradeMsg(msg, false);
        addTradeToHistory({ ts: Date.now(), side: 'buy', amount: amount, price: oldPrice, fee: FEE_PCT, auto: !!isAuto });
    } else {
        if (vpiBalance < amount) { if (!isAuto) showTradeMsg("Nincs elég VPI eladásra", true); return false; }
        const proceeds = amount * price * (1 - FEE_PCT);
        vpiBalance -= amount;
        usdBalance += proceeds;
        price = price + priceChange;
        const pct = ((price - oldPrice) / oldPrice) * 100;
        const msg = `Eladás végrehajtva${isAuto? ' (auto)':''} — ár: +${pct.toFixed(4)}% (fee ${(FEE_PCT*100).toFixed(2)}%)`;
        showTradeMsg(msg, false);
        addTradeToHistory({ ts: Date.now(), side: 'sell', amount: amount, price: oldPrice, fee: FEE_PCT, auto: !!isAuto });
    }

    // Update visuals immediately
    priceEl.textContent = "$" + price.toFixed(4);

    history.push(price);
    if (history.length > 180) history.shift();
    chart.data.datasets[0].data = history;
    chart.update("none");

    // Update market info
    const newMarketCap = price * circulatingSupply;
    const newFdv = price * totalSupply;
    if (marketCapEl) marketCapEl.textContent = formatNumber(newMarketCap, true);
    if (fdvEl) fdvEl.textContent = formatNumber(newFdv, true);

    // persist balances and new price/history
    localStorage.setItem("vpiUSD", usdBalance);
    localStorage.setItem("vpiHoldings", vpiBalance);
    updateTradeUI();

    // persist previous price so percent can be shown after reload
    localStorage.setItem("vpiLastPrice", lastPrice);
    lastPrice = price;

    localStorage.setItem("vpiPrice", price);
    localStorage.setItem("vpiHistory", JSON.stringify(history));

    return true;
}

function executeTrade() {
    const amount = parseFloat(tradeAmountEl.value);
    const side = tradeSideEl.value;
    const ok = doTrade(side, amount, false);
    if (ok) { tradeAmountEl.value = ''; renderTradeHistory(); }
}

if (tradeBtn) tradeBtn.addEventListener("click", executeTrade);
if (tradeAmountEl) tradeAmountEl.addEventListener("keydown", (e) => { if (e.key === "Enter") executeTrade(); });
if (buyMaxBtn) buyMaxBtn.addEventListener("click", buyMax);
if (sellMaxBtn) sellMaxBtn.addEventListener("click", sellMax);

updateTradeUI();
renderTradeHistory();

// --- Auto orders (set triggers) ---
const autoSideEl = document.getElementById('autoSide');
const autoPriceEl = document.getElementById('autoPrice');
const autoAmountEl = document.getElementById('autoAmount');
const autoRepeatEl = document.getElementById('autoRepeat');
const addAutoBtn = document.getElementById('addAutoBtn');
const autoListEl = document.getElementById('autoList');

let autoOrders = localStorage.getItem('vpiAutoOrders') ? JSON.parse(localStorage.getItem('vpiAutoOrders')) : [];

function saveAutoOrders() {
    localStorage.setItem('vpiAutoOrders', JSON.stringify(autoOrders));
}

function renderAutoOrders() {
    if (!autoListEl) return;
    if (!autoOrders || autoOrders.length === 0) { autoListEl.textContent = '—'; return; }
    autoListEl.innerHTML = '';
    autoOrders.forEach(o => {
        const div = document.createElement('div');
        div.className = 'auto-item';
        div.innerHTML = `<div class="left"><div class="side ${o.side}">${o.side.toUpperCase()}</div><div class="price">$${o.target.toFixed(4)}</div><div class="amt">${o.amount.toFixed(4)} VPI</div></div><div class="controls"><button data-id="${o.id}" class="trigger-btn">${o.enabled? 'On':'Off'}</button><button data-id="${o.id}" class="del-btn">Del</button></div>`;
        autoListEl.appendChild(div);
    });
    // attach handlers
    document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        autoOrders = autoOrders.filter(a => a.id !== id);
        saveAutoOrders(); renderAutoOrders();
    }));
    document.querySelectorAll('.trigger-btn').forEach(b => b.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const ord = autoOrders.find(a => a.id === id); if (!ord) return;
        ord.enabled = !ord.enabled; saveAutoOrders(); renderAutoOrders();
    }));
}

function addAutoOrder() {
    const side = autoSideEl.value;
    const target = parseFloat(autoPriceEl.value);
    const amount = parseFloat(autoAmountEl.value);
    const repeat = !!autoRepeatEl.checked;
    if (!target || target <= 0 || !amount || amount <= 0) { showTradeMsg('Adj meg érvényes célarat és mennyiséget', true); return; }
    const o = { id: String(Date.now()) + Math.random().toString(36).slice(2,6), side, target, amount, repeat, enabled: true };
    autoOrders.unshift(o); saveAutoOrders(); renderAutoOrders();
    autoPriceEl.value = ''; autoAmountEl.value = ''; autoRepeatEl.checked = false;
}
if (addAutoBtn) addAutoBtn.addEventListener('click', addAutoOrder);
renderAutoOrders();

function checkAutoOrders() {
    if (!autoOrders || autoOrders.length === 0) return;
    autoOrders.forEach(o => {
        if (!o.enabled) return;
        if (o.side === 'buy' && price <= o.target) {
            // attempt buy
            // check USD with fee
            const totalCost = o.amount * price * (1 + FEE_PCT);
            if (usdBalance < totalCost) { showTradeMsg('Auto-buy failed: nincs elég USD', true); o.enabled = false; saveAutoOrders(); renderAutoOrders(); return; }
            // execute
            doAutoExecute(o);
        }
        if (o.side === 'sell' && price >= o.target) {
            if (vpiBalance < o.amount) { showTradeMsg('Auto-sell failed: nincs elég VPI', true); o.enabled = false; saveAutoOrders(); renderAutoOrders(); return; }
            doAutoExecute(o);
        }
    });
}

function doAutoExecute(o) {
    // Run same trade logic but mark auto
    // Call the core trade function with auto flag
    const executed = doTrade(o.side, o.amount, true);
    if (executed) {
        if (!o.repeat) { o.enabled = false; }
        saveAutoOrders(); renderAutoOrders();
    } else {
        o.enabled = false; saveAutoOrders(); renderAutoOrders();
    }
}

function update() {
    // LASSABB, ENYHÉBB MOZGÁS
    const volatility = price * 0.001; // 0.1% per tick (slower)
    const delta = (Math.random() * volatility * 2) - volatility;

    price = Math.max(0.000001, price + delta);

    let percentChange = 0;
    if (lastPrice && lastPrice > 0) {
        percentChange = ((price - lastPrice) / lastPrice) * 100;
    }
    const up = percentChange >= 0;

    // KIÍRÁS – KILENCEN TIZEDES HELYETT 4 TIZEDES A MEGJELENÍTÉSBEN
    priceEl.textContent = "$" + price.toFixed(4);
    percentEl.textContent = (up ? "+" : "") + Math.abs(percentChange).toFixed(2) + "%";
    arrowEl.textContent = up ? "▲" : "▼";

    changeEl.className = "change " + (up ? "up" : "down");

    chart.data.datasets[0].borderColor = up ? "#22c55e" : "#ef4444";
    chart.data.datasets[0].backgroundColor = up
        ? "rgba(34,197,94,0.12)"
        : "rgba(239,68,68,0.12)";

    history.push(price);
    if (history.length > 180) history.shift();

    chart.data.datasets[0].data = history;
    chart.update("none");

    // Update market info (market cap, FDV, volume)
    const marketCap = price * circulatingSupply;
    const fdv = price * totalSupply;
    
    // Calculate volume based on selected period
    let dailyVolume = (Math.random() * 20 + 5) * 1000000; // 5-25M base daily volume
    let volume = dailyVolume;
    
    if (currentVolumePeriod === "week") {
        volume = dailyVolume * 7;
    } else if (currentVolumePeriod === "day") {
        volume = dailyVolume;
    } else if (currentVolumePeriod === "minute") {
        volume = dailyVolume / 1440; // 24h = 1440 min
    } else if (currentVolumePeriod === "second") {
        volume = dailyVolume / 86400; // 24h = 86400 sec
    }

    if (marketCapEl) marketCapEl.textContent = formatNumber(marketCap, true);
    if (fdvEl) fdvEl.textContent = formatNumber(fdv, true);
    if (volumeEl) volumeEl.textContent = formatNumber(volume, true);

    if (totalSupplyEl) totalSupplyEl.textContent = formatNumber(totalSupply);
    if (circulatingEl) circulatingEl.textContent = formatNumber(circulatingSupply);
    if (maxSupplyEl) maxSupplyEl.textContent = formatNumber(maxSupply);

    // Volume selector listener
    if (volumePeriodEl) {
        volumePeriodEl.addEventListener('change', (e) => {
            currentVolumePeriod = e.target.value;
        });
    }

    // Check auto orders after a price update
    checkAutoOrders();

    // persist previous price so percent can be shown after reload
    localStorage.setItem("vpiLastPrice", lastPrice);
    lastPrice = price;

    localStorage.setItem("vpiPrice", price);
    localStorage.setItem("vpiHistory", JSON.stringify(history));
}

// INDÍTÁS
update();
setInterval(update, 2000); // frissítés 2 másodpercenként