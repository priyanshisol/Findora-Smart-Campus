/**
 * UI Utilities & Helpers for Findora
 */

// Theme Management (Light/Dark Mode)
function initTheme() {
  const savedTheme = localStorage.getItem('findora_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('findora_theme', newTheme);
  updateThemeIcon(newTheme);
  showToast(`Switched to ${newTheme} theme`, 'info');
}

function updateThemeIcon(theme) {
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'dark'
      ? '<i class="bi bi-sun-fill text-warning fs-5"></i>'
      : '<i class="bi bi-moon-stars-fill text-primary fs-5"></i>';
  }
}

// Toast Notification Engine
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container-findora';
    document.body.appendChild(container);
  }

  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    danger: 'bi-x-circle-fill text-danger',
    warning: 'bi-exclamation-triangle-fill text-warning',
    info: 'bi-info-circle-fill text-primary',
  };

  const toast = document.createElement('div');
  toast.className = `toast-findora toast-${type}`;
  toast.innerHTML = `
    <i class="bi ${iconMap[type] || iconMap.info} fs-5"></i>
    <div style="flex-grow:1; font-weight: 500; font-size: 0.95rem;">${message}</div>
    <button type="button" class="btn-close ms-auto" style="font-size: 0.75rem;" onclick="this.parentElement.remove()"></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// Relative Time Formatter
function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// HTML5 Geolocation API Helper
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    showToast('Acquiring your GPS location...', 'info');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        showToast('Location acquired successfully!', 'success');
        resolve(coords);
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please type your location manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        showToast(msg, 'warning');
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Empty State HTML Generator
function renderEmptyState(title, description, actionBtnHtml = '') {
  return `
    <div class="text-center py-5 my-4 px-3 card-findora">
      <div class="mb-3">
        <i class="bi bi-search-heart text-muted display-4"></i>
      </div>
      <h5 class="fw-bold mb-2">${title}</h5>
      <p class="text-muted small mx-auto mb-4" style="max-width: 420px;">${description}</p>
      ${actionBtnHtml}
    </div>
  `;
}
