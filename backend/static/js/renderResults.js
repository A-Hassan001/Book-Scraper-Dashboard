// static/js/renderResults.js

/**
 * Render the grouped results
 * @param {Array} data - The array of groups from API
 */
export function renderResults(data) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">No results found</div>
            </div>
        `;
        return;
    }

    data.forEach((group, index) => {
        const groupKey = group.Seller || group.Isbn || 'Unknown';
        const groupId = `group-${index}`;

        const groupCard = document.createElement('div');
        groupCard.className = 'col-12';

        groupCard.innerHTML = `
            <div class="card mb-3">

                <!-- Clickable header -->
                <div
                    class="card-header bg-light d-flex justify-content-between align-items-center cursor-pointer"
                    data-group-id="${groupId}"
                >
                    <div>
                        <h5 class="mb-1">${groupKey}</h5>
                        <small class="text-muted">
                            Available: ${group['Available Books']} |
                            Sold: ${group['Books Sold']} |
                            Rotation: ${group['Average Rotation (%)']}
                        </small>
                    </div>
                    <span class="toggle-icon">+</span>
                </div>

                <!-- Collapsible body (hidden initially) -->
                <div
                    id="${groupId}"
                    class="card-body d-none"
                    data-rendered="false"
                >

                    <div class="row mb-2">
                    <strong>List of Available Books: ${group['Available Books']}</strong>
                        <div class="col-md-4">
                            <strong>Avg Price:</strong> ${group['Average Price']}
                        </div>
                        <div class="col-md-4">
                            <strong>Min Price:</strong> ${group['Minimum Price']}
                        </div>
                        <div class="col-md-4">
                            <strong>Max Price:</strong> ${group['Maximum Price']}
                        </div>
                    </div>

                    <div class="list-group"></div>
                </div>

            </div>
        `;

        container.appendChild(groupCard);

        // Attach click handler for collapse toggle + lazy render
        const header = groupCard.querySelector('.card-header');
        header.addEventListener('click', () => toggleGroup(group, groupId, header));
    });
}

/**
 * Toggle a group's items visibility
 * Lazy renders items on first click
 */
function toggleGroup(group, groupId, header) {
    const body = document.getElementById(groupId);
    const listGroup = body.querySelector('.list-group');
    const icon = header.querySelector('.toggle-icon');

    // Lazy render (first time only)
    if (body.dataset.rendered === 'false') {
        listGroup.innerHTML = renderItems(group.results);
        body.dataset.rendered = 'true';
    }

    body.classList.toggle('d-none');
    icon.textContent = body.classList.contains('d-none') ? '+' : '−';
}

/**
 * Render individual items for a group
 */
 function renderItems(items) {
    if (!items || items.length === 0) {
        return `<div class="text-muted">No available books</div>`;
    }

    return items.map((item, index) => `
        <a href="${item.url}" target="_blank" rel="noopener noreferrer"
        class="list-group-item list-group-item-action d-flex align-items-center gap-3 text-decoration-none">

            <!-- Item number -->
            <div>
                ${index + 1}.
            </div>

            <!-- Book image -->
            <img src="${item.image || '/static/images/no-book.png'}" alt="${item.name || 'Book image'}"
            style="width: 50px; height: 70px; object-fit: cover;" class="rounded border">

            <!-- Book info -->
            <div class="flex-grow-1">
                <strong class="text-dark">${item.name || 'Untitled'}</strong><br>
                <small class="text-muted"> ${item.seller} | ${item.condition} | ${item.isbn} </small><br>
                <small class="text-muted">
                Scraped Date: ${item.first_seen || 'N/A'} | Last seen: ${item.date_scraped || 'N/A'}
                </small>
            </div>

            <!-- Price -->
            <div class="text-end"> <span class="fw-bold text-dark"> ${item.price}</span> </div>
        </a>
    `).join('');
}


//function renderItems(items) {
//    if (!items || items.length === 0) {
//        return `<div class="text-muted">No available books</div>`;
//    }
//
//    return items.map(item => `
//        <a href="${item.url}" target="_blank" rel="noopener noreferrer"
//        class="list-group-item list-group-item-action d-flex align-items-center gap-3 text-decoration-none">
//
//            <!-- Item number -->
//            <div class="fw-bold" style="width: 25px; text-align: center;">
//                ${index + 1}.
//            </div>
//
//            <!-- Book image -->
//            <img src="${item.image || '/static/images/no-book.png'}" alt="${item.name || 'Book image'}"
//            style="width: 50px; height: 70px; object-fit: cover;" class="rounded border">
//
//            <!-- Book info -->
//            <div class="flex-grow-1">
//                <strong class="text-dark">${item.name || 'Untitled'}</strong><br>
//                <small class="text-muted"> ${item.seller} | ${item.condition} | ${item.isbn} </small><br>
//                <small class="text-muted"> Scraped Date: ${item.date_scraped} </small>
//            </div>
//
//            <!-- Price -->
//            <div class="text-end"> <span class="fw-bold text-dark"> ${item.price}</span> </div>
//        </a>
//    `).join('');
//}
