/**
 * Administrator Dashboard Controller with Chart.js Analytics
 */
let chartInstances = {};

async function loadAdminDashboard() {
  if (!currentUser || currentUser.role !== 'admin') {
    showToast('Admin access required', 'danger');
    navigateTo('home');
    return;
  }

  await Promise.all([
    loadAdminStats(),
    loadAdminAnalyticsCharts(),
    loadAdminClaimsQueue(),
    loadAdminItemModeration(),
    loadAdminUsersList(),
    loadAdminActivityLogs(),
  ]);
}

async function loadAdminStats() {
  try {
    const res = await AdminAPI.getDashboardStats();
    if (res.success && res.stats) {
      const s = res.stats;
      document.getElementById('adminStatStudents').textContent = s.totalUsers;
      document.getElementById('adminStatLost').textContent = s.totalLost;
      document.getElementById('adminStatFound').textContent = s.totalFound;
      document.getElementById('adminStatPendingClaims').textContent = s.pendingClaims;
      document.getElementById('adminStatRecovered').textContent = s.recoveredItems;
      document.getElementById('adminStatRecoveryRate').textContent = `${s.recoveryRate}%`;
    }
  } catch (err) {
    showToast('Failed to load admin summary stats', 'warning');
  }
}

async function loadAdminAnalyticsCharts() {
  try {
    const res = await AdminAPI.getAnalytics();
    if (!res.success || !res.analytics) return;

    const { categoryBreakdown, lostVsFound, claimStatusDist } = res.analytics;

    // Destroy existing chart instances before re-rendering
    Object.keys(chartInstances).forEach((key) => {
      if (chartInstances[key]) chartInstances[key].destroy();
    });

    // 1. Lost vs Found Chart
    const ctxLostFound = document.getElementById('chartLostVsFound');
    if (ctxLostFound) {
      const lostCount = (lostVsFound.find((x) => x._id === 'lost') || {}).count || 0;
      const foundCount = (lostVsFound.find((x) => x._id === 'found') || {}).count || 0;

      chartInstances.lostFound = new Chart(ctxLostFound, {
        type: 'doughnut',
        data: {
          labels: ['Lost Items', 'Found Items'],
          datasets: [
            {
              data: [lostCount, foundCount],
              backgroundColor: ['#ef4444', '#10b981'],
              borderWidth: 2,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }

    // 2. Categories Breakdown Chart
    const ctxCategory = document.getElementById('chartCategories');
    if (ctxCategory) {
      const labels = categoryBreakdown.map((c) => c._id || 'Other');
      const data = categoryBreakdown.map((c) => c.count);

      chartInstances.category = new Chart(ctxCategory, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Total Reports',
              data: data,
              backgroundColor: '#2563eb',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }

    // 3. Claim Status Distribution Chart
    const ctxClaims = document.getElementById('chartClaimStatus');
    if (ctxClaims) {
      const labels = claimStatusDist.map((c) => (c._id || 'pending').replace('_', ' ').toUpperCase());
      const data = claimStatusDist.map((c) => c.count);

      chartInstances.claims = new Chart(ctxClaims, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: ['#f59e0b', '#06b6d4', '#10b981', '#ef4444'],
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  } catch (err) {
    console.warn('Chart analytics error:', err);
  }
}

async function loadAdminClaimsQueue() {
  const container = document.getElementById('adminClaimsTableBody');
  if (!container) return;

  try {
    const res = await ClaimAPI.getAdminClaims();
    if (res.success && res.claims.length > 0) {
      container.innerHTML = res.claims.map((claim) => {
        const item = claim.itemId || {};
        const claimant = claim.claimantId || {};

        return `
          <tr>
            <td>
              <div class="fw-bold">${item.title || 'Unknown Item'}</div>
              <span class="badge bg-secondary fs-8">${item.category || 'N/A'}</span>
            </td>
            <td>
              <div class="fw-bold">${claimant.name || 'Anonymous Student'}</div>
              <div class="text-muted small">${claimant.studentId || ''} (${claimant.department || ''})</div>
            </td>
            <td>
              <div class="small text-truncate" style="max-width: 220px;" title="${claim.explanation}">
                ${claim.explanation}
              </div>
              <div class="badge bg-light text-dark border mt-1" title="${claim.privateDetails}">
                <i class="bi bi-lock-fill me-1 text-warning"></i> Private Verification Details
              </div>
            </td>
            <td>
              <span class="badge ${claim.status === 'approved' ? 'bg-success' : claim.status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'}">
                ${claim.status.toUpperCase()}
              </span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-success" onclick="reviewClaimAdmin('${claim._id}', 'approved')" title="Approve Claim">
                  <i class="bi bi-check-circle"></i> Approve
                </button>
                <button class="btn btn-outline-danger" onclick="reviewClaimAdmin('${claim._id}', 'rejected')" title="Reject Claim">
                  <i class="bi bi-x-circle"></i> Reject
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      container.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No pending claims in review queue.</td></tr>`;
    }
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Error loading claims</td></tr>`;
  }
}

async function reviewClaimAdmin(claimId, status) {
  const adminRemarks = prompt(`Enter optional administrator remarks for setting status to ${status.toUpperCase()}:`, '');
  if (adminRemarks === null) return; // User cancelled prompt

  try {
    const res = await ClaimAPI.updateStatus(claimId, { status, adminRemarks });
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminClaimsQueue();
      loadAdminStats();
    }
  } catch (err) {
    showToast(err.message || 'Error updating claim', 'danger');
  }
}

async function loadAdminItemModeration() {
  const container = document.getElementById('adminItemsTableBody');
  if (!container) return;

  try {
    const res = await ItemAPI.getAll({ limit: 100 });
    if (res.success && res.items.length > 0) {
      container.innerHTML = res.items.map((item) => `
        <tr>
          <td>
            <div class="fw-bold">${item.title}</div>
            <div class="text-muted fs-8">${item.location}</div>
          </td>
          <td><span class="badge ${item.type === 'lost' ? 'bg-danger' : 'bg-success'}">${item.type.toUpperCase()}</span></td>
          <td>${item.category}</td>
          <td>
            <select class="form-select form-select-sm" onchange="handleAdminItemStatusChange('${item._id}', this.value)">
              <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="matched" ${item.status === 'matched' ? 'selected' : ''}>Matched</option>
              <option value="claimed" ${item.status === 'claimed' ? 'selected' : ''}>Claimed</option>
              <option value="recovered" ${item.status === 'recovered' ? 'selected' : ''}>Recovered</option>
            </select>
          </td>
          <td>${item.reportedBy ? item.reportedBy.name : 'Unknown'}</td>
          <td>
            <button class="btn btn-outline-danger btn-sm" onclick="handleAdminDeleteItem('${item._id}')"><i class="bi bi-trash"></i> Delete</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error loading items</td></tr>`;
  }
}

async function handleAdminItemStatusChange(itemId, newStatus) {
  try {
    const res = await AdminAPI.updateItemStatus(itemId, newStatus);
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminStats();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update item status', 'danger');
  }
}

async function handleAdminDeleteItem(itemId) {
  if (!confirm('Are you sure you want to permanently delete this report?')) return;
  try {
    const res = await AdminAPI.deleteItem(itemId);
    if (res.success) {
      showToast(res.message, 'success');
      loadAdminItemModeration();
      loadAdminStats();
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete report', 'danger');
  }
}

async function loadAdminUsersList() {
  const container = document.getElementById('adminUsersTableBody');
  if (!container) return;

  try {
    const res = await AdminAPI.getUsers();
    if (res.success && res.users.length > 0) {
      container.innerHTML = res.users.map((u) => `
        <tr>
          <td class="fw-bold">${u.name}</td>
          <td>${u.email}</td>
          <td>${u.studentId || 'N/A'}</td>
          <td>${u.department || 'N/A'}</td>
          <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'} text-capitalize">${u.role}</span></td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error loading users</td></tr>`;
  }
}

async function loadAdminActivityLogs() {
  const container = document.getElementById('adminActivityLogsContainer');
  if (!container) return;

  try {
    const res = await AdminAPI.getActivityLogs();
    if (res.success && res.logs.length > 0) {
      container.innerHTML = res.logs.map((log) => `
        <div class="d-flex gap-3 align-items-center p-2 border-bottom">
          <div class="badge bg-secondary p-2"><i class="bi bi-clock-history"></i></div>
          <div class="flex-grow-1">
            <div class="fw-semibold text-main fs-7">${log.action.replace(/_/g, ' ')}</div>
            <div class="text-muted fs-8">${log.userId ? log.userId.name : 'System'} • ${formatRelativeTime(log.timestamp)}</div>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<p class="text-muted small p-3 mb-0">No recent activity logs recorded.</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="text-danger small p-3 mb-0">Error loading activity logs.</p>`;
  }
}
