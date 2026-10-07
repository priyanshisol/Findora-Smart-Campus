/**
 * Findora Main SPA Router and Application Initialization
 */

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await checkAuthState();
  handleRouting();

  window.addEventListener('hashchange', handleRouting);

  // Setup periodic notification polling every 30s when logged in
  setInterval(() => {
    if (currentUser) {
      loadUserNotifications();
    }
  }, 30000);
});

function navigateTo(viewId) {
  window.location.hash = viewId;
}

function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'home';

  // Hide all view sections
  document.querySelectorAll('.view-section').forEach((section) => {
    section.style.display = 'none';
  });

  // Update navbar active state
  document.querySelectorAll('.nav-link-custom').forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${hash}`) {
      link.classList.add('active');
    }
  });

  // Show target view section
  const targetSection = document.getElementById(`view-${hash}`);
  if (targetSection) {
    targetSection.style.display = 'block';
  } else {
    document.getElementById('view-home').style.display = 'block';
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // View specific initialization logic
  switch (hash) {
    case 'home':
      loadLandingPageData();
      break;
    case 'explore':
      loadExploreItems();
      break;
    case 'report-lost':
      setupReportFormListeners('reportLostForm', 'lost');
      break;
    case 'report-found':
      setupReportFormListeners('reportFoundForm', 'found');
      break;
    case 'dashboard':
      loadStudentDashboard();
      break;
    case 'admin-dashboard':
      loadAdminDashboard();
      break;
  }

  if (currentUser) {
    loadUserNotifications();
  }
}
