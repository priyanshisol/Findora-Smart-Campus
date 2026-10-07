/**
 * Landing Page Controller
 */

async function loadLandingPageData() {
  await loadLandingStats();
  await loadRecentItemsLanding();
}

async function loadLandingStats() {
  try {
    const res = await ItemAPI.getAll({ limit: 100 });
    if (res.success) {
      const items = res.items || [];
      const totalLost = items.filter((i) => i.type === 'lost').length;
      const totalFound = items.filter((i) => i.type === 'found').length;
      const totalRecovered = items.filter((i) => i.status === 'recovered').length;

      document.getElementById('statTotalReports').textContent = items.length || 7;
      document.getElementById('statTotalLost').textContent = totalLost || 4;
      document.getElementById('statTotalFound').textContent = totalFound || 3;
      document.getElementById('statRecovered').textContent = totalRecovered || 1;
    }
  } catch (err) {
    console.warn('Unable to load live stats for landing page:', err);
  }
}

async function loadRecentItemsLanding() {
  const container = document.getElementById('landingRecentItemsContainer');
  if (!container) return;

  try {
    const res = await ItemAPI.getAll({ limit: 4 });
    if (res.success && res.items.length > 0) {
      container.innerHTML = res.items
        .map((item) => renderItemCardHTML(item))
        .join('');
    } else {
      container.innerHTML = renderEmptyState('No Recent Reports', 'Be the first to publish a lost or found item report.');
    }
  } catch (err) {
    container.innerHTML = '<p class="text-muted text-center">Unable to load recent items.</p>';
  }
}

function renderItemCardHTML(item) {
  const imageSrc = item.images && item.images.length > 0
    ? resolveImageUrl(item.images[0])
    : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop';

  const badgeClass = item.type === 'lost' ? 'badge-type-lost' : 'badge-type-found';
  const typeText = item.type === 'lost' ? 'Lost Item' : 'Found Item';

  return `
    <div class="col-md-6 col-lg-3 mb-4">
      <div class="card-findora item-card h-100">
        <div class="item-card-img-wrapper">
          <img src="${imageSrc}" class="item-card-img" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop'">
          <span class="item-badge-status ${badgeClass}">${typeText}</span>
        </div>
        <div class="item-card-body">
          <span class="item-category-tag">${item.category}</span>
          <h6 class="fw-bold mb-2 text-truncate" title="${item.title}">${item.title}</h6>
          <p class="text-muted small mb-3 flex-grow-1" style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${item.description}
          </p>
          <div class="d-flex align-items-center justify-content-between text-muted fs-7 pt-2 border-top">
            <span class="text-truncate" style="max-width: 140px;"><i class="bi bi-geo-alt me-1 text-primary"></i>${item.location}</span>
            <span><i class="bi bi-clock me-1"></i>${formatRelativeTime(item.reportDate)}</span>
          </div>
          <button class="btn btn-findora-secondary btn-sm w-100 mt-3" onclick="viewItemDetails('${item._id}')">
            <i class="bi bi-eye me-1"></i> View Details
          </button>
        </div>
      </div>
    </div>
  `;
}
