import { renderResults } from './renderResults.js';

// Debounce utility to avoid spamming the API while typing prices
function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    loadMarketplaces();
    loadPriceRange();
    loadConditions();

    setupPriceChangeListeners();
    setupDaysFilter();
    document.getElementById('todayOnly')?.addEventListener('change', applyFilters);

    // Wire the Apply button and invoke once on load
    wireApplyFiltersButton();
    invokeApplyFiltersWhenReady();
});

/* -------------------- DAYS FILTER -------------------- */

function setupDaysFilter() {
    const container = document.getElementById('daysFilter');
    const hidden = document.getElementById('daysOld');

    if (!container || !hidden) return;

    // Run only once
    if (container.dataset.bound === '1') return;
    container.dataset.bound = '1';

    const setActive = (btn) => {
        container.querySelectorAll('.btn-days').forEach(b => {
            b.classList.remove('active', 'btn-primary');
            b.classList.add('btn-outline-primary');
            b.setAttribute('aria-pressed', 'false');
        });

        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-outline-primary');
        btn.setAttribute('aria-pressed', 'true');

        hidden.value = btn.dataset.days;
    };

    // 🔹 DO NOT override user clicks — only set if empty
    if (!hidden.value) {
        const initial =
            container.querySelector('.btn-days.active') ||
            container.querySelector('.btn-days[data-default="1"]') ||
            container.querySelector('.btn-days');

        if (initial) setActive(initial);
    }

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-days');
        if (!btn) return;

        setActive(btn);

        // ✅ CALL API AFTER DAY CHANGE
        if (typeof applyFilters === 'function') {
            applyFilters();
        } else if (typeof window.applyFilters === 'function') {
            window.applyFilters();
        }
    });
}



/* -------------------- APPLY FILTERS -------------------- */

// Attach click handler to #applyFiltersBtn (even if it appears later)
function wireApplyFiltersButton() {
    const attach = () => {
        const btn = document.getElementById('applyFiltersBtn');
        if (!btn) return false;

        if (btn.dataset.bound === '1') return true;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            invokeApplyFiltersWhenReady();
        });

        btn.dataset.bound = '1';
        return true;
    };

    if (attach()) return;

    const observer = new MutationObserver(() => {
        if (attach()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Call applyFilters once it exists
function invokeApplyFiltersWhenReady() {
    const tryCall = () => {
        const fn =
            typeof applyFilters === 'function'
                ? applyFilters
                : typeof window !== 'undefined' && typeof window.applyFilters === 'function'
                    ? window.applyFilters
                    : null;

        if (!fn) return false;

        try {
            fn();
        } catch (err) {
            console.error('applyFilters threw an error:', err);
        }
        return true;
    };

    if (tryCall()) return;

    let attempts = 0;
    const timer = setInterval(() => {
        if (tryCall() || ++attempts >= 50) {
            clearInterval(timer);
        }
    }, 100);
}

/* -------------------- PRICE -------------------- */

function setupPriceChangeListeners() {
    const tryAttach = () => {
        const minEl = document.getElementById('minPrice');
        const maxEl = document.getElementById('maxPrice');
        if (!minEl || !maxEl) return false;

        const debouncedReload = debounce(() => {
            const prices = getPriceValues(minEl, maxEl);
            if (prices !== null || (minEl.value === '' && maxEl.value === '')) {
                loadConditions();
            }
        }, 300);

        minEl.addEventListener('input', debouncedReload);
        maxEl.addEventListener('input', debouncedReload);
        return true;
    };

    if (tryAttach()) return;

    const observer = new MutationObserver(() => {
        if (tryAttach()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function getPriceValues(minEl, maxEl) {
    const min = parseFloat(minEl?.value);
    const max = parseFloat(maxEl?.value);

    const hasMin = !Number.isNaN(min);
    const hasMax = !Number.isNaN(max);

    if (hasMin && hasMax && (min < 0 || max < 0 || min >= max)) return null;

    const out = {};
    if (hasMin && min >= 0) out.min = min;
    if (hasMax && max >= 0) out.max = max;
    return Object.keys(out).length ? out : null;
}

/* -------------------- MARKETPLACES -------------------- */

async function loadMarketplaces() {
    const res = await fetch('/api/market_place_names/');
    const data = await res.json();

    const container = document.getElementById('marketplaceContainer');
    container.innerHTML = '';

    let hidden = document.getElementById('marketplace');
    if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = 'marketplace';
        hidden.name = 'marketplace';
        container.parentElement.appendChild(hidden);
    }

    const state = new Map();
    const updateHidden = () => {
        const selectedItems = [];
        state.forEach((arr, key) => {
            arr.forEach(v => selectedItems.push(`${key}_${v}`));
        });
        hidden.value = selectedItems.join(',');
        loadConditions();
    };

    Object.entries(data).forEach(([marketplace, variants]) => {
        const safeId = String(marketplace)
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_-]/g, '');

        const card = document.createElement('div');
        card.className = 'd-flex flex-column p-2 border rounded';

        const header = document.createElement('div');
        header.className = 'fw-semibold cursor-pointer';
        header.textContent = marketplace;

        const panel = document.createElement('div');
        panel.style.display = 'none';
        panel.className = 'mt-2';

        const cbs = [];
        (variants || []).forEach((v, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'form-check';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'form-check-input';
            cb.value = v;

            const lbl = document.createElement('label');
            lbl.className = 'form-check-label';
            lbl.textContent = v;

            wrap.append(cb, lbl);
            panel.appendChild(wrap);
            cbs.push(cb);
        });

        header.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        cbs.forEach(cb =>
            cb.addEventListener('change', () => {
                const selected = cbs.filter(x => x.checked).map(x => x.value);
                selected.length
                    ? state.set(marketplace, selected)
                    : state.delete(marketplace);
                updateHidden();
            })
        );

        card.append(header, panel);
        container.appendChild(card);
    });

    updateHidden();
}

/* -------------------- PRICE RANGE -------------------- */

async function loadPriceRange() {
    const res = await fetch('/api/price_range_of_books/');
    const data = await res.json();

    document.getElementById('minPrice').value = data.min_price;
    document.getElementById('maxPrice').value = data.max_price;
}

/* -------------------- CONDITIONS -------------------- */

async function loadConditions() {
    const minEl = document.getElementById('minPrice');
    const maxEl = document.getElementById('maxPrice');
    const marketHidden = document.getElementById('marketplace');

    const params = new URLSearchParams();

    if (marketHidden?.value) params.set('domains', marketHidden.value);

    const prices = getPriceValues(minEl, maxEl);
    if (prices?.min !== undefined) params.set('min_price', prices.min);
    if (prices?.max !== undefined) params.set('max_price', prices.max);

    const url = `/api/conditions_of_books/${params.toString() ? '?' + params : ''}`;

    try {
        const res = await fetch(url);
        populateConditions(await res.json());
    } catch {
        populateConditions([]);
    }
}

function populateConditions(list) {
    const select = document.getElementById('condition');
    select.innerHTML = '<option value="">All Conditions</option>';
    list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
}

/* -------------------- FINAL FILTER -------------------- */


function applyFilters() {
    const params = new URLSearchParams();

    const marketplace = document.getElementById('marketplace')?.value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const condition = document.getElementById('condition').value;
    const groupBy = document.getElementById('groupBy').value;
    const days = document.getElementById('daysOld')?.value || '30';
//    const todayOnly = document.getElementById('todayOnly')?.checked;

    if (marketplace) params.append('domains', marketplace);
    if (minPrice) params.append('min_price', minPrice);
    if (maxPrice) params.append('max_price', maxPrice);
    if (condition) params.append('condition', condition);
    if (groupBy) params.append('group_by', groupBy);
    if (days) {params.append('days_old', days);}

//    // 🔹 Today only overrides days filter
//    if (todayOnly) {
//        params.append('today_only', 'true');
//    } else if (days) {
//        params.append('days_old', days);
//    }

    fetch(`/api/all_filtered_results/?${params.toString()}`)
        .then(res => res.json())
        .then(renderResults)
        .catch(err => console.error('Error fetching filtered results', err));
}

//function applyFilters() {
//    const params = new URLSearchParams();
//
//    const marketplace = document.getElementById('marketplace')?.value;
//    const minPrice = document.getElementById('minPrice').value;
//    const maxPrice = document.getElementById('maxPrice').value;
//    const condition = document.getElementById('condition').value;
//    const groupBy = document.getElementById('groupBy').value;
//    const days = document.getElementById('daysOld')?.value || '30';
//
//    if (marketplace) params.append('domains', marketplace);
//    if (minPrice) params.append('min_price', minPrice);
//    if (maxPrice) params.append('max_price', maxPrice);
//    if (condition) params.append('condition', condition);
//    if (groupBy) params.append('group_by', groupBy);
//    if (days) params.append('days', days); // ✅ NEW

//    fetch(`/api/all_filtered_results/?${params.toString()}`)
//        .then(res => res.json())
//        .then(renderResults)
//        .catch(err => console.error('Error fetching filtered results', err));
//}



