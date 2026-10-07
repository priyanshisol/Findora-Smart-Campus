/**
 * Item Detail and Claim Submission Controller
 */
let currentViewedItem = null;

async function viewItemDetails(itemId) {
  try {
    const res = await ItemAPI.getById(itemId);
    if (res.success && res.item) {
      currentViewedItem = res.item;
      renderItemDetailModal(res.item);
      loadItemSmartMatches(itemId);
    }
  } catch (err) {
    showToast('Unable to fetch item details: ' + err.message, 'danger');
  }
}

function renderItemDetailModal(item) {
  const modalEl = document.getElementById('itemDetailModal');
  if (!modalEl) return;

  const imageSrc = item.images && item.images.length > 0
    ? resolveImageUrl(item.images[0])
    : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop';

  const badgeClass = item.type === 'lost' ? 'badge-type-lost' : 'badge-type-found';
  const typeText = item.type === 'lost' ? 'Lost Item Report' : 'Found Item Report';

  document.getElementById('itemDetailModalTitle').textContent = item.title;
  document.getElementById('itemDetailModalBody').innerHTML = `
    <div class="row g-4">
      <div class="col-md-5">
        <div style="border-radius: var(--radius-md); overflow: hidden; height: 260px; background: var(--bg-card-hover);">
          <img src="${imageSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.title}">
        </div>
        <div class="mt-3 p-3 card-findora">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="item-badge-status ${badgeClass} position-relative top-0 left-0 m-0">${typeText}</span>
            <span class="badge bg-secondary-subtle text-secondary">${item.status.toUpperCase()}</span>
          </div>
          <div class="text-muted fs-7 mb-1"><i class="bi bi-tag me-1 text-primary"></i> Category: <strong>${item.category}</strong></div>
          <div class="text-muted fs-7 mb-1"><i class="bi bi-geo-alt me-1 text-danger"></i> Location: <strong>${item.location}</strong></div>
          <div class="text-muted fs-7"><i class="bi bi-calendar-event me-1 text-teal"></i> Date: <strong>${new Date(item.reportDate).toLocaleDateString()}</strong></div>
        </div>
      </div>
      <div class="col-md-7">
        <h4 class="fw-bold mb-3">${item.title}</h4>
        <div class="mb-4">
          <h6 class="fw-bold text-muted fs-7 text-uppercase">Description</h6>
          <p class="text-main" style="white-space: pre-line;">${item.description}</p>
        </div>

        ${item.distinctiveDetails ? `
          <div class="p-3 mb-4 card-findora bg-body-tertiary border-start border-4 border-primary">
            <h6 class="fw-bold fs-7 text-primary text-uppercase mb-1"><i class="bi bi-shield-check me-1"></i> Distinctive Identifying Details</h6>
            <p class="small mb-0 text-muted">${item.distinctiveDetails}</p>
          </div>
        ` : ''}

        <div class="p-3 card-findora mb-4">
          <h6 class="fw-bold fs-7 text-muted text-uppercase mb-2">Reported By</h6>
          <div class="d-flex align-items-center gap-2">
            <div class="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
              ${item.reportedBy ? item.reportedBy.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div class="fw-bold text-main">${item.reportedBy ? item.reportedBy.name : 'Campus Member'}</div>
              <div class="text-muted small">${item.reportedBy ? item.reportedBy.department : 'University Campus'}</div>
            </div>
          </div>
        </div>

        <div id="itemDetailMatchesContainer" class="mb-4">
          <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          <span class="text-muted small ms-2">Calculating smart matches...</span>
        </div>

        <div class="d-flex gap-2">
          ${item.type === 'found' && item.status !== 'recovered' ? `
            <button class="btn btn-findora-primary w-100" onclick="openClaimModal('${item._id}')">
              <i class="bi bi-hand-index-thumb me-1"></i> Submit Ownership Claim
            </button>
          ` : ''}
          <button class="btn btn-findora-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

async function loadItemSmartMatches(itemId) {
  const container = document.getElementById('itemDetailMatchesContainer');
  if (!container) return;

  try {
    const res = await ItemAPI.getMatches(itemId);

    if (res.success && res.matches.length > 0) {
      let html = `
        <div class="card-findora p-3 border-start border-4 border-teal mb-3">
          <h6 class="fw-bold fs-7 text-teal text-uppercase mb-2 d-flex align-items-center justify-content-between">
            <span><i class="bi bi-cpu me-1"></i> Smart Matching Suggestions (${res.matches.length})</span>
            <span class="badge bg-teal-subtle text-teal">AI Similarity Engine</span>
          </h6>
      `;

      res.matches.slice(0, 2).forEach((match) => {
        const otherItem = match.lostItemId && match.lostItemId._id === itemId ? match.foundItemId : match.lostItemId;
        if (!otherItem) return;

        const details = match.similarityDetails || {};
        const matchClass = details.matchCategory === 'High' ? 'match-high' : details.matchCategory === 'Medium' ? 'match-medium' : 'match-low';

        html += `
          <div class="p-2 mb-2 rounded bg-body-tertiary border">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <span class="fw-bold fs-7 text-truncate" style="max-width: 200px;">${otherItem.title}</span>
              <span class="match-score-badge ${matchClass}">${match.score}% ${details.matchCategory} Match</span>
            </div>
            <div class="progress mb-2" style="height: 6px;">
              <div class="progress-bar bg-primary" role="progressbar" style="width: ${match.score}%;"></div>
            </div>
            <div class="d-flex justify-content-between text-muted fs-8">
              <span>Title: ${details.nameScore || 0}%</span>
              <span>Desc: ${details.descScore || 0}%</span>
              <span>Cat: ${details.catScore || 0}%</span>
              <span>Loc: ${details.locScore || 0}%</span>
            </div>
          </div>
        `;
      });

      html += `</div>`;
      container.innerHTML = html;
    } else {
      container.innerHTML = `<p class="text-muted fs-8 mb-0"><i class="bi bi-info-circle me-1"></i> No high-confidence matches found yet.</p>`;
    }
  } catch (err) {
    container.innerHTML = '';
  }
}

function openClaimModal(itemId) {
  if (!currentUser) {
    showToast('Please log in to submit an ownership claim', 'warning');
    openLoginModal();
    return;
  }

  // Close item detail modal if open
  const detailModalEl = document.getElementById('itemDetailModal');
  const detailModal = bootstrap.Modal.getInstance(detailModalEl);
  if (detailModal) detailModal.hide();

  const claimModalEl = document.getElementById('claimModal');
  document.getElementById('claimItemIdInput').value = itemId;

  const claimModal = new bootstrap.Modal(claimModalEl);
  claimModal.show();
}

async function handleClaimSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const itemId = form.itemId.value;
  const explanation = form.explanation.value;
  const privateDetails = form.privateDetails.value;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Submitting Claim...`;

  try {
    const formData = new FormData();
    formData.append('itemId', itemId);
    formData.append('explanation', explanation);
    formData.append('privateDetails', privateDetails);

    const fileInput = document.getElementById('claimEvidenceInput');
    if (fileInput && fileInput.files.length > 0) {
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('evidence', fileInput.files[i]);
      }
    }

    const res = await ClaimAPI.create(formData);
    if (res.success) {
      showToast(res.message, 'success');
      form.reset();
      const claimModalEl = document.getElementById('claimModal');
      const claimModal = bootstrap.Modal.getInstance(claimModalEl);
      if (claimModal) claimModal.hide();
      navigateTo('dashboard');
    }
  } catch (err) {
    showToast(err.message || 'Error submitting claim', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="bi bi-send me-1"></i> Submit Claim for Review`;
  }
}
