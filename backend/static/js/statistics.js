// static/js/statistics.js

/**
 * Fetches and displays main statistics from the API
 */
export function loadStatistics() {
    const statsContainer = document.getElementById('statsContainer');

    // Show loading state
    statsContainer.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading statistics...</span>
            </div>
        </div>
    `;

    // Fetch data from API
    fetch('/api/main_stats/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            renderStatistics(data);
        })
        .catch(error => {
            console.error('Error loading statistics:', error);
            statsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        Failed to load statistics. Please try again later.
                    </div>
                </div>
            `;
        });
}

/**
 * Renders statistics in a 2x3 grid layout
 * @param {Object} stats - Statistics data from API
 */
function renderStatistics(stats) {
    const statsContainer = document.getElementById('statsContainer');

    // Define stat cards configuration
    const statCards = [
        {
            key: 'Total Books',
            value: stats['Total Books']?.toLocaleString() || '0',
            icon: '📚',
            description: 'Total books in the system',
            bgClass: 'bg-primary',
            textClass: 'text-white'
        },
        {
            key: 'Unique Sellers',
            value: stats['Unique Sellers']?.toLocaleString() || '0',
            icon: '👥',
            description: 'Distinct sellers',
            bgClass: 'bg-success',
            textClass: 'text-white'
        },
        {
            key: 'Average Price',
            value: `$${stats['Average Price']?.toFixed(2) || '0.00'}`,
            icon: '💰',
            description: 'Average book price',
            bgClass: 'bg-info',
            textClass: 'text-white'
        },
        {
            key: 'Rotation Rate',
            value: stats['Rotation Rate'] || '0%',
            icon: '🔄',
            description: 'Inventory turnover rate',
            bgClass: 'bg-warning',
            textClass: 'text-dark'
        },
        {
            key: 'Hot Books',
            value: stats['Hot Books']?.toLocaleString() || '0',
            icon: '🔥',
            description: 'High-demand books',
            bgClass: 'bg-danger',
            textClass: 'text-white'
        },
        {
            key: 'Sold Books',
            value: stats['Sold Books']?.toLocaleString() || '0',
            icon: '🛒',
            description: 'Books sold',
            bgClass: 'bg-secondary',
            textClass: 'text-white'
        }
    ];

    // Create HTML for stat cards
    let statsHTML = '';

    statCards.forEach((stat, index) => {
        statsHTML += `
            <div class="col-md-4 col-sm-6 mb-4">
                <div class="stat-card h-100 shadow-sm rounded-3 overflow-hidden">
                    <div class="${stat.bgClass} p-3 ${stat.textClass}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fs-1 mb-1">${stat.icon}</div>
                                <h6 class="mb-0 text-uppercase small opacity-75">${stat.key}</h6>
                            </div>
                            <h3 class="mb-0 fw-bold">${stat.value}</h3>
                        </div>
                    </div>
                    <div class="bg-light p-3">
                        <small class="text-muted">${stat.description}</small>
                    </div>
                </div>
            </div>
        `;

        // Close row after every 3 items for medium+ screens
        if ((index + 1) % 3 === 0) {
            statsHTML += '</div><div class="row">';
        }
    });

    // Wrap in rows
    statsContainer.innerHTML = `
        <div class="row">
            ${statsHTML}
        </div>
    `;
}

/**
 * Initialize statistics when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Auto-load if container exists
    if (document.getElementById('statsContainer')) {
        loadStatistics();

        // Optional: Refresh every 5 minutes
        // setInterval(loadStatistics, 300000);
    }
});