/**
 * price-validation.js
 * Exports validation functions for min/max price inputs.
 */

export function validatePrices(minEl, maxEl) {
    let min = parseFloat(minEl.value);
    let max = parseFloat(maxEl.value);

    if (!isNaN(min) && min < 0) { minEl.value = 0; min = 0; }
    if (!isNaN(max) && max < 0) { maxEl.value = 0; max = 0; }

    const bothNonEmpty = minEl.value !== '' && maxEl.value !== '';
    if (bothNonEmpty && !isNaN(min) && !isNaN(max) && min >= max) {
        minEl.style.borderColor = '#ef4444';
        maxEl.style.borderColor = '#ef4444';
    } else {
        minEl.style.borderColor = '';
        maxEl.style.borderColor = '';
    }
}

export function getPriceValues(minEl, maxEl) {
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

export function setupPriceValidation(onPriceChange, debounceFn) {
    const minEl = document.getElementById('minPrice');
    const maxEl = document.getElementById('maxPrice');
    if (!minEl || !maxEl) return;

    const debouncedReload = debounceFn(() => {
        const prices = getPriceValues(minEl, maxEl);
        if (prices !== null || (minEl.value === '' && maxEl.value === '')) {
            onPriceChange();
        }
    }, 400);

    minEl.addEventListener('input', () => {
        validatePrices(minEl, maxEl);
        debouncedReload();
    });

    maxEl.addEventListener('input', () => {
        validatePrices(minEl, maxEl);
        debouncedReload();
    });
}