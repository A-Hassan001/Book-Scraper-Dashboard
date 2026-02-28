/**
 * renderResults.js – pure rendering of grouped results with interest & contact buttons.
 */

const INTEREST_ICON = {
    pending:        { html: '☆', title: 'Mark as Interested',    cls: 'interest-pending' },
    interested:     { html: '★', title: 'Mark as Not Interested', cls: 'interest-interested' },
    not_interested: { html: '✕', title: 'Reset to Pending',       cls: 'interest-not-interested' },
};

export function renderResults(data) {
    const container = document.getElementById('resultsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-warning">No results found for the selected filters.</div></div>`;
        return;
    }

    data.forEach((group, index) => {
        const groupKey = group.Seller || group.Isbn || group.isbn || 'Unknown';
        const groupId  = `group-${index}`;

        const wrapper = document.createElement('div');
        wrapper.className = 'col-12';
        wrapper.innerHTML = `
            <div class="card mb-3">
                <div class="card-header bg-light d-flex justify-content-between align-items-center cursor-pointer"
                     data-group-id="${groupId}">
                    <div>
                        <h5 class="mb-1">${escHtml(groupKey)}</h5>
                        <small class="text-muted">
                            Available: ${group['Available Books'] ?? 0} |
                            Sold: ${group['Books Sold'] ?? 0} |
                            Rotation: ${group['Average Rotation (%)'] ?? '0%'}
                        </small>
                    </div>
                    <span class="toggle-icon">+</span>
                </div>
                <div id="${groupId}" class="card-body d-none" data-rendered="false">
                    <div class="row mb-2">
                        <strong>Available Books: ${group['Available Books'] ?? 0}</strong>
                        <div class="col-md-4"><strong>Avg:</strong> €${group['Average Price'] ?? 0}</div>
                        <div class="col-md-4"><strong>Min:</strong> €${group['Minimum Price'] ?? 0}</div>
                        <div class="col-md-4"><strong>Max:</strong> €${group['Maximum Price'] ?? 0}</div>
                    </div>
                    <div class="list-group"></div>
                </div>
            </div>`;

        container.appendChild(wrapper);

        const header = wrapper.querySelector('.card-header');
        const body   = document.getElementById(groupId);

        header.addEventListener('click', () => {
            const wasHidden = body.classList.contains('d-none');
            toggleGroup(group, groupId, header);
            const nowHidden = body.classList.contains('d-none');
            if (wasHidden !== nowHidden) {
                nowHidden
                    ? window.openGroups?.delete(groupKey)
                    : window.openGroups?.add(groupKey);
            }
        });

        if (window.openGroups?.has(groupKey)) {
            toggleGroup(group, groupId, header);
        }
    });
}

function toggleGroup(group, groupId, header) {
    const body      = document.getElementById(groupId);
    const listGroup = body.querySelector('.list-group');
    const icon      = header.querySelector('.toggle-icon');

    if (body.dataset.rendered === 'false') {
        listGroup.innerHTML = renderItems(group.results || []);
        body.dataset.rendered = 'true';
    }

    body.classList.toggle('d-none');
    icon.textContent = body.classList.contains('d-none') ? '+' : '−';
}

function renderItems(items) {
    if (!items || items.length === 0) {
        return `<div class="text-muted p-3">No available books in this group.</div>`;
    }

    return items.map((item, index) => {
        const interest = item.interest || 'pending';
        const cfg      = INTEREST_ICON[interest] ?? INTEREST_ICON.pending;
        const contact  = item.contact === true;
        const contactIcon = contact ? '📞' : '✆';

        return `
            <a href="${escHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer"
               class="list-group-item list-group-item-action d-flex align-items-center gap-3 text-decoration-none">

                <!-- Interest button (no inline onclick) -->
                <button class="interest-btn ${cfg.cls}"
                        data-detail-id="${item.detail_id}"
                        data-interest="${interest}"
                        title="${cfg.title}">
                    ${cfg.html}
                </button>

                <!-- Contact button (no inline onclick) -->
                <button class="contact-btn ${contact ? 'contact-true' : 'contact-false'}"
                        data-detail-id="${item.detail_id}"
                        data-contact="${contact}"
                        title="${contact ? 'Contacted' : 'Mark as contacted'}">
                    ${contactIcon}
                </button>

                <div class="item-index">${index + 1}.</div>

                <img src="${escHtml(item.image || '/static/images/no-book.png')}"
                     alt="${escHtml(item.name || 'Book')}"
                     style="width:50px;height:70px;object-fit:cover;"
                     class="rounded border"
                     onerror="this.src='/static/images/no-book.png'">

                <div class="flex-grow-1 min-width-0">
                    <strong class="text-dark d-block text-truncate">${escHtml(item.name || 'Untitled')}</strong>
                    <small class="text-muted">
                        ${escHtml(item.seller || '—')} | ${escHtml(item.condition || '—')} | ${escHtml(item.isbn || '—')}
                    </small><br>
                    <small class="text-muted">
                        First Scraped At: ${item.first_seen || 'N/A'} &nbsp;|&nbsp; Updated Scraped At: ${item.date_scraped || 'N/A'}
                    </small>
                </div>

                <div class="text-end flex-shrink-0">
                    <span class="fw-bold text-dark">€${item.price ?? '—'}</span>
                </div>
            </a>
        `;
    }).join('');
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}