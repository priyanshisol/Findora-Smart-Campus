/**
 * Student Dashboard Controller
 */

async function loadStudentDashboard() {
  if (!currentUser) {
    showToast('Please log in to view your dashboard', 'warning');
    openLoginModal();
    return;
  }

  // Set Profile Header Info
  document.getElementById('dashUserName').textContent = currentUser.name;
  document.getElementById('dashUserDept').textContent = currentUser.department;
  document.getElementById('dashUserId').textContent = currentUser.studentId;
  document.getElementById('dashUserAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

  await Promise.all([
    loadStudentReports(),
    loadStudentClaims(),
    loadStudentMatches(),
  ]);
}

async function loadStudentReports() {
  const container = document.getElementById('dashMyReportsContainer');
  if (!container) return;

  try {
    const res = await ItemAPI.getAll({ limit: 100 });
    if (res.success) {
      const myItems = res.items.filter((item) => item.reportedBy && (item.reportedBy._id === currentUser._id || item.reportedBy === currentUser._id));

      const lostCount = myItems.filter((i) => i.type === 'lost').length;
      const foundCount = myItems.filter((i) => i.type === 'found').length;
      const recoveredCount = myItems.filter((i) => i.status === 'recovered').length;

      document.getElementById('dashStatLostCount').textContent = lostCount;
      document.getElementById('dashStatFoundCount').textContent = foundCount;
      document.getElementById('dashStatRecoveredCount').textContent = recoveredCount;

      if (myItems.length > 0) {
        container.innerHTML = myItems.map((item) => `
          <div class="col-md-6 col-lg-4 mb-3">
            <div class="card-findora p-3 h-100 d-flex flex-column">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="item-badge-status ${item.type === 'lost' ? 'badge-type-lost' : 'badge-type-found'} position-relative top-0 left-0 m-0">${item.type.toUpperCase()}</span>
                <span class="badge bg-secondary-subtle text-secondary">${item.status}</span>
              </div>
              <h6 class="fw-bold mb-1 text-truncate">${item.title}</h6>
              <p class="text-muted small mb-2 text-truncate">${item.description}</p>
              <div class="text-muted fs-8 mb-3"><i class="bi bi-geo-alt me-1"></i> ${item.location}</div>
              <div class="mt-auto pt-2 border-top d-flex gap-2">
                <button class="btn btn-findora-secondary btn-sm flex-grow-1" onclick="viewItemDetails('${item._id}')"><i class="bi bi-eye me-1"></i> View</button>
                <button class="btn btn-outline-danger btn-sm" onclick="handleDeleteMyItem('${item._id}')"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = renderEmptyState('No Reports Published', 'You have not submitted any lost or found reports yet.', '<button class="btn btn-findora-primary btn-sm" onclick="navigateTo(\'report-lost\')">Report an Item</button>');
      }
    }
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Error loading reports: ${err.message}</p>`;
  }
}

async function loadStudentClaims() {
  const container = document.getElementById('dashMyClaimsContainer');
  if (!container) return;

  try {
    const res = await ClaimAPI.getMyClaims();
    if (res.success) {
      const claims = res.claims || [];
      document.getElementById('dashStatActiveClaimsCount').textContent = claims.length;

      if (claims.length > 0) {
        container.innerHTML = claims.map((claim) => {
          const item = claim.itemId || {};
          const statusBadgeMap = {
            pending: 'bg-warning-subtle text-warning border-warning-subtle',
            under_review: 'bg-info-subtle text-info border-info-subtle',
            approved: 'bg-success-subtle text-success border-success-subtle',
            rejected: 'bg-danger-subtle text-danger border-danger-subtle',
          };

          return `
            <div class="col-12 mb-3">
              <div class="card-findora p-3 border-start border-4 ${claim.status === 'approved' ? 'border-success' : claim.status === 'rejected' ? 'border-danger' : 'border-warning'}">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <h6 class="fw-bold mb-0">${item.title || 'Claimed Found Item'}</h6>
                  <span class="badge border ${statusBadgeMap[claim.status] || 'bg-secondary'} text-capitalize">${claim.status.replace('_', ' ')}</span>
                </div>
                <p class="text-muted small mb-2"><strong>Your Explanation:</strong> ${claim.explanation}</p>
                ${claim.adminRemarks ? `
                  <div class="p-2 bg-body-tertiary rounded fs-8 text-dark mb-2">
                    <i class="bi bi-chat-left-quote-fill me-1 text-primary"></i> <strong>Admin Remarks:</strong> ${claim.adminRemarks}
                  </div>
                ` : ''}
                <div class="text-muted fs-8"><i class="bi bi-clock me-1"></i> Submitted ${formatRelativeTime(claim.createdAt)}</div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        container.innerHTML = renderEmptyState('No Submitted Claims', 'You have not submitted any ownership claims for found items.');
      }
    }
  } catch (err) {
    container.innerHTML = `<p class="text-danger">Error loading claims: ${err.message}</p>`;
  }
}

async function loadStudentMatches() {
  const container = document.getElementById('dashMatchesContainer');
  if (!container) return;

  try {
    const res = await ItemAPI.getAll({ limit: 100 });
    if (!res.success) return;

    const myItems = res.items.filter((item) => item.reportedBy && (item.reportedBy._id === currentUser._id || item.reportedBy === currentUser._id));

    if (myItems.length === 0) {
      container.innerHTML = renderEmptyState('No Match Suggestions', 'Create a lost or found report to automatically receive smart match suggestions.');
      return;
    }

    let allMatches = [];
    for (let item of myItems) {
      const matchRes = await ItemAPI.getMatches(item._id);
      if (matchRes.success && matchRes.matches.length > 0) {
        allMatches.push(...matchRes.matches);
      }
    }

    if (allMatches.length > 0) {
      container.innerHTML = allMatches.map((match) => {
        const isMyLost = myItems.some((i) => i._id === (match.lostItemId._id || match.lostItemId));
        const matchedItem = isMyLost ? match.foundItemId : match.lostItemId;
        if (!matchedItem) return '';

        const details = match.similarityDetails || {};
        const matchClass = details.matchCategory === 'High' ? 'match-high' : details.matchCategory === 'Medium' ? 'match-medium' : 'match-low';

        return `
          <div class="col-md-6 mb-3">
            <div class="card-findora p-3 h-100 border-start border-4 border-primary">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="match-score-badge ${matchClass}"><i class="bi bi-lightning-charge-fill me-1"></i> ${match.score}% ${details.matchCategory} Match</span>
                <span class="fs-8 text-muted">${formatRelativeTime(match.createdAt)}</span>
              </div>
              <h6 class="fw-bold mb-1">${matchedItem.title || 'Matching Item'}</h6>
              <p class="text-muted small mb-2 text-truncate">${matchedItem.description || ''}</p>
              <div class="progress mb-2" style="height: 6px;">
                <div class="progress-bar bg-primary" style="width: ${match.score}%;"></div>
              </div>
              <button class="btn btn-findora-secondary btn-sm w-100 mt-2" onclick="viewItemDetails('${matchedItem._id}')">
                <i class="bi bi-eye me-1"></i> Inspect Matched Item
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = renderEmptyState('No Match Suggestions Yet', 'Our smart algorithm scans continuously for matching items.');
    }
  } catch (err) {
    container.innerHTML = `<p class="text-muted">No matches loaded.</p>`;
  }
}

async function handleDeleteMyItem(itemId) {
  if (!confirm('Are you sure you want to delete this report?')) return;
  try {
    const res = await ItemAPI.delete(itemId);
    if (res.success) {
      showToast('Report deleted successfully', 'success');
      loadStudentReports();
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete report', 'danger');
  }
}
