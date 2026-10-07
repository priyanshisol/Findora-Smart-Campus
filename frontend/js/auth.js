/**
 * Authentication Module for Findora
 */
let currentUser = null;

async function checkAuthState() {
  try {
    const res = await AuthAPI.getMe();
    if (res.success && res.user) {
      currentUser = res.user;
    } else {
      currentUser = null;
    }
  } catch (err) {
    currentUser = null;
  }
  updateNavbarAuthUI();
  return currentUser;
}

function updateNavbarAuthUI() {
  const container = document.getElementById('navAuthContainer');
  if (!container) return;

  if (currentUser) {
    const isAdmin = currentUser.role === 'admin';
    container.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-findora-secondary dropdown-toggle d-flex align-items-center gap-2 py-1 px-3" type="button" data-bs-toggle="dropdown">
          <div class="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 0.85rem;">
            ${currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div class="text-start d-none d-md-block">
            <div class="fw-bold fs-7 leading-tight">${currentUser.name}</div>
            <div class="text-muted fs-8 leading-tight text-capitalize">${currentUser.role}</div>
          </div>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 p-2" style="border-radius: var(--radius-md);">
          <li class="px-3 py-2 border-bottom mb-1">
            <div class="fw-bold">${currentUser.name}</div>
            <div class="text-muted small">${currentUser.email}</div>
            ${isAdmin ? '<span class="badge bg-danger mt-1">Administrator</span>' : `<span class="badge bg-primary mt-1">${currentUser.department}</span>`}
          </li>
          ${isAdmin ? '<li><a class="dropdown-item py-2 fw-semibold" href="#admin-dashboard" onclick="navigateTo(\'admin-dashboard\')"><i class="bi bi-shield-lock me-2 text-primary"></i>Admin Dashboard</a></li>' : ''}
          <li><a class="dropdown-item py-2 fw-semibold" href="#dashboard" onclick="navigateTo('dashboard')"><i class="bi bi-speedometer2 me-2 text-primary"></i>Student Dashboard</a></li>
          <li><a class="dropdown-item py-2 fw-semibold" href="#report-lost" onclick="navigateTo('report-lost')"><i class="bi bi-plus-circle me-2 text-danger"></i>Report Lost Item</a></li>
          <li><a class="dropdown-item py-2 fw-semibold" href="#report-found" onclick="navigateTo('report-found')"><i class="bi bi-plus-circle me-2 text-success"></i>Report Found Item</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item py-2 text-danger fw-semibold" href="#" onclick="handleLogout()"><i class="bi bi-box-arrow-right me-2"></i>Log Out</a></li>
        </ul>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-findora-secondary btn-sm px-3" onclick="openLoginModal()">Log In</button>
        <button class="btn btn-findora-primary btn-sm px-3" onclick="openRegisterModal()">Register</button>
      </div>
    `;
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value;

  try {
    const res = await AuthAPI.login({ email, password });
    if (res.success) {
      currentUser = res.user;
      showToast(res.message, 'success');
      const modalEl = document.getElementById('loginModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      updateNavbarAuthUI();

      if (currentUser.role === 'admin') {
        navigateTo('admin-dashboard');
      } else {
        navigateTo('dashboard');
      }
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value;
  const email = form.email.value;
  const studentId = form.studentId.value;
  const department = form.department.value;
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;

  try {
    const res = await AuthAPI.register({
      name,
      email,
      studentId,
      department,
      password,
      confirmPassword,
    });

    if (res.success) {
      currentUser = res.user;
      showToast(res.message, 'success');
      const modalEl = document.getElementById('registerModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      updateNavbarAuthUI();
      navigateTo('dashboard');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function handleLogout() {
  try {
    await AuthAPI.logout();
    currentUser = null;
    updateNavbarAuthUI();
    showToast('Logged out successfully', 'info');
    navigateTo('home');
  } catch (err) {
    showToast('Logout error', 'danger');
  }
}

function fillDemoLogin(role) {
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');

  if (role === 'admin') {
    emailInput.value = 'admin@campus.edu';
    passInput.value = 'adminpassword123';
  } else {
    emailInput.value = 'alex.morgan@campus.edu';
    passInput.value = 'student123';
  }
  showToast(`Autofilled demo credentials for ${role.toUpperCase()}`, 'info');
}

function openLoginModal() {
  const modalEl = document.getElementById('loginModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function openRegisterModal() {
  const modalEl = document.getElementById('registerModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}
