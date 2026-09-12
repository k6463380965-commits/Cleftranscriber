const uploadPanel = document.querySelector('.upload-panel');
const fileInput = document.querySelector('#file-input');
const toast = document.querySelector('.toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function handleFile(file) {
  if (!file) return;
  const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const heading = uploadPanel.querySelector('h2');
  heading.textContent = `${title} is ready`;
  uploadPanel.querySelector('.drop-note').textContent = 'We will detect pitch, rhythm and key signature next.';
  showToast('Recording added to your workspace');
}

fileInput.addEventListener('change', (event) => handleFile(event.target.files[0]));
['dragenter', 'dragover'].forEach((eventName) => uploadPanel.addEventListener(eventName, (event) => {
  event.preventDefault();
  uploadPanel.classList.add('is-dragging');
}));
['dragleave', 'drop'].forEach((eventName) => uploadPanel.addEventListener(eventName, (event) => {
  event.preventDefault();
  uploadPanel.classList.remove('is-dragging');
}));
uploadPanel.addEventListener('drop', (event) => handleFile(event.dataTransfer.files[0]));