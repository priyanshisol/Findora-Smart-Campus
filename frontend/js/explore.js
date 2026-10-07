/**
 * Explore Items Marketplace Controller
 */
let exploreState = {
  search: '',
  category: 'All',
  type: '',
  sortBy: 'newest',
  page: 1,
  limit: 8,
  viewMode: 'grid', // 'grid' or 'list'
};

async function loadExploreItems() {
  const container = document.getElementById('exploreItemsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="col-12 py-5 text-center">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-muted mt-2">Searching Findora database...</p>
    </div>
  `;

  try {
    const params = {
      search: exploreState.search,
      category: exploreState.category === 'All' ? '' : exploreState.category,
      type: exploreState.type,
      sortBy: exploreState.sortBy,
      page: exploreState.page,
      limit: exploreState.limit,
    };

    const res = await ItemAPI.getAll(params);

    if (res.success && res.items.length > 0) {
      if (exploreState.viewMode === 'grid') {
        container.innerHTML = res.items
          .map((item) => renderItemCardHTML(item))
          .join('');
      } else {
        container.innerHTML = res.items
          .map((item) => renderItemListHTML(item))
          .join('');
      }
      renderPagination(res.totalPages, res.currentPage);
    } else {
      container.innerHTML = `
        <div class="col-12">
          ${renderEmptyState(
            'No Matching Items Found',
            'Try adjusting your search keywords, clear category filters, or check back later.',
            '<button class="btn btn-findora-primary btn-sm" onclick="resetExploreFilters()"><i class="bi bi-arrow-counterclockwise me-1"></i> Reset All Filters</button>'
          )}
        </div>
      `;
      document.getElementById('explorePaginationContainer').innerHTML = '';
    }

    // Update count indicator
    document.getElementById('exploreResultCount').textContent = `${res.total || 0} items found`;
  } catch (err) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">Error loading items from database: ${err.message}</div>
      </div>
    `;
  }
}

function renderItemListHTML(item) {
  const imageSrc = item.images && item.images.length > 0
    ? resolveImageUrl(item.images[0])
    : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop';

  const badgeClass = item.type === 'lost' ? 'badge-type-lost' : 'badge-type-found';
  const typeText = item.type === 'lost' ? 'Lost Item' : 'Found Item';

  return `
    <div class="col-12 mb-3">
      <div class="card-findora p-3">
        <div class="row align-items-center g-3">
          <div class="col-md-3">
            <div style="height: 120px; border-radius: var(--radius-md); overflow: hidden;">
              <img src="${imageSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.title}">
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="item-badge-status ${badgeClass} position-relative top-0 left-0 m-0">${typeText}</span>
              <span class="item-category-tag mb-0">${item.category}</span>
            </div>
            <h5 class="fw-bold mb-1">${item.title}</h5>
            <p class="text-muted small mb-2 text-truncate">${item.description}</p>
            <div class="d-flex align-items-center gap-3 text-muted fs-7">
              <span><i class="bi bi-geo-alt me-1 text-primary"></i>${item.location}</span>
              <span><i class="bi bi-clock me-1"></i>${formatRelativeTime(item.reportDate)}</span>
            </div>
          </div>
          <div class="col-md-3 text-md-end">
            <button class="btn btn-findora-primary btn-sm w-100" onclick="viewItemDetails('${item._id}')">
              <i class="bi bi-eye me-1"></i> View Details & Claim
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPagination(totalPages, currentPage) {
  const container = document.getElementById('explorePaginationContainer');
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `<ul class="pagination pagination-findora justify-content-center my-4">`;

  // Previous button
  html += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <button class="page-link" onclick="changeExplorePage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>
    </li>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <button class="page-link" onclick="changeExplorePage(${i})">${i}</button>
      </li>
    `;
  }

  // Next button
  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <button class="page-link" onclick="changeExplorePage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>
    </li>
  `;

  html += `</ul>`;
  container.innerHTML = html;
}

function changeExplorePage(page) {
  exploreState.page = page;
  loadExploreItems();
  window.scrollTo({ top: 400, behavior: 'smooth' });
}

function handleSearchInput(e) {
  exploreState.search = e.target.value;
  exploreState.page = 1;
  loadExploreItems();
}

function handleCategoryFilter(category) {
  exploreState.category = category;
  exploreState.page = 1;

  // Update active pill styling
  document.querySelectorAll('.cat-pill-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-cat') === category);
  });

  loadExploreItems();
}

function handleTypeFilter(type) {
  exploreState.type = type;
  exploreState.page = 1;
  loadExploreItems();
}

function handleSortChange(sortBy) {
  exploreState.sortBy = sortBy;
  loadExploreItems();
}

function toggleViewMode(mode) {
  exploreState.viewMode = mode;
  document.getElementById('btnGridView').classList.toggle('active', mode === 'grid');
  document.getElementById('btnListView').classList.toggle('active', mode === 'list');
  loadExploreItems();
}

function resetExploreFilters() {
  exploreState.search = '';
  exploreState.category = 'All';
  exploreState.type = '';
  exploreState.sortBy = 'newest';
  exploreState.page = 1;

  const searchInput = document.getElementById('exploreSearchInput');
  if (searchInput) searchInput.value = '';

  handleCategoryFilter('All');
}
