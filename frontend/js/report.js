/**
 * Lost & Found Report Form Controller
 */
let reportUploadedFiles = [];
let detectedCoords = { latitude: null, longitude: null };

function setupReportFormListeners(formId, type) {
  const form = document.getElementById(formId);
  if (!form) return;

  reportUploadedFiles = [];
  detectedCoords = { latitude: null, longitude: null };

  // Drag and drop zone setup
  const dropzone = document.getElementById(`${type}Dropzone`);
  const fileInput = document.getElementById(`${type}FileInput`);

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files, type);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files, type);
      }
    });
  }
}

function handleFileSelection(files, type) {
  for (let file of files) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload image files only', 'warning');
      continue;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(`File ${file.name} exceeds 5MB size limit`, 'warning');
      continue;
    }
    reportUploadedFiles.push(file);
  }
  renderImagePreviews(type);
}

function renderImagePreviews(type) {
  const container = document.getElementById(`${type}PreviewContainer`);
  if (!container) return;

  container.innerHTML = '';
  reportUploadedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const item = document.createElement('div');
      item.className = 'image-preview-item';
      item.innerHTML = `
        <img src="${e.target.result}" alt="preview">
        <div class="image-preview-remove" onclick="removeReportImage(${index}, '${type}')">&times;</div>
      `;
      container.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
}

function removeReportImage(index, type) {
  reportUploadedFiles.splice(index, 1);
  renderImagePreviews(type);
}

async function handleDetectLocation(type) {
  try {
    const coords = await getCurrentLocation();
    detectedCoords = coords;
    const locInput = document.getElementById(`${type}Location`);
    if (locInput && !locInput.value) {
      locInput.value = `GPS Coords (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
    }
    const badge = document.getElementById(`${type}GpsBadge`);
    if (badge) {
      badge.innerHTML = `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-geo-alt-fill me-1"></i> GPS Locked</span>`;
    }
  } catch (err) {
    console.warn('Geolocation detection failed:', err);
  }
}

async function handleReportSubmit(event, type) {
  event.preventDefault();

  if (!currentUser) {
    showToast('Please log in to publish a report', 'warning');
    openLoginModal();
    return;
  }

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Publishing Report...`;

  try {
    const formData = new FormData();
    formData.append('title', form.title.value);
    formData.append('category', form.category.value);
    formData.append('description', form.description.value);
    formData.append('type', type);
    formData.append('location', form.location.value);

    if (form.reportDate && form.reportDate.value) {
      formData.append('reportDate', form.reportDate.value);
    }

    if (detectedCoords.latitude && detectedCoords.longitude) {
      formData.append('latitude', detectedCoords.latitude);
      formData.append('longitude', detectedCoords.longitude);
    }

    if (form.distinctiveDetails && form.distinctiveDetails.value) {
      formData.append('distinctiveDetails', form.distinctiveDetails.value);
    }

    if (form.contactMethod && form.contactMethod.value) {
      formData.append('contactMethod', form.contactMethod.value);
    }

    // Append uploaded files
    reportUploadedFiles.forEach((file) => {
      formData.append('images', file);
    });

    const res = await ItemAPI.create(formData);

    if (res.success) {
      showToast(res.message, 'success');
      form.reset();
      reportUploadedFiles = [];
      renderImagePreviews(type);
      navigateTo('dashboard');
    }
  } catch (err) {
    showToast(err.message || 'Failed to submit report', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="bi bi-send me-1"></i> Publish ${type === 'lost' ? 'Lost' : 'Found'} Item Report`;
  }
}
