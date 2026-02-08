// Admin Panel JavaScript

let adminPassword = '';
let allResponses = [];

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initAdminActions();
});

function initLogin() {
  const loginForm = document.getElementById('loginForm');
  const loginContainer = document.getElementById('loginContainer');
  const adminContainer = document.getElementById('adminContainer');
  const loginError = document.getElementById('loginError');

  // Check if already logged in (session storage)
  const savedPassword = sessionStorage.getItem('adminPassword');
  if (savedPassword) {
    adminPassword = savedPassword;
    verifyAndShowAdmin();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById('passwordInput');
    adminPassword = passwordInput.value;

    try {
      const response = await fetch('/api/admin/responses', {
        headers: {
          'X-Admin-Password': adminPassword
        }
      });

      if (response.ok) {
        sessionStorage.setItem('adminPassword', adminPassword);
        loginContainer.style.display = 'none';
        adminContainer.style.display = 'block';
        loadData();
      } else {
        loginError.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (error) {
      console.error('Login error:', error);
      loginError.style.display = 'block';
    }
  });
}

async function verifyAndShowAdmin() {
  try {
    const response = await fetch('/api/admin/responses', {
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    if (response.ok) {
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('adminContainer').style.display = 'block';
      loadData();
    } else {
      sessionStorage.removeItem('adminPassword');
    }
  } catch (error) {
    sessionStorage.removeItem('adminPassword');
  }
}

function initAdminActions() {
  // Export CSV
  document.getElementById('exportBtn').addEventListener('click', () => {
    window.location.href = `/api/admin/export?password=${encodeURIComponent(adminPassword)}`;
  });

  // Refresh
  document.getElementById('refreshBtn').addEventListener('click', loadData);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminPassword');
    adminPassword = '';
    document.getElementById('adminContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('passwordInput').value = '';
  });

  // Filter
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    renderTable(filterResponses(e.target.value));
  });
}

async function loadData() {
  await Promise.all([loadStats(), loadResponses()]);
}

async function loadStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    if (response.ok) {
      const stats = await response.json();
      document.getElementById('statTotal').textContent = stats.total;
      document.getElementById('statAttending').textContent = stats.attending;
      document.getElementById('statNotAttending').textContent = stats.notAttending;
      document.getElementById('statMaybe').textContent = stats.maybe;
      document.getElementById('statTotalGuests').textContent = stats.totalGuests;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadResponses() {
  try {
    const response = await fetch('/api/admin/responses', {
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    if (response.ok) {
      allResponses = await response.json();
      const filter = document.getElementById('statusFilter').value;
      renderTable(filterResponses(filter));
    }
  } catch (error) {
    console.error('Error loading responses:', error);
  }
}

function filterResponses(status) {
  if (status === 'all') {
    return allResponses;
  }
  return allResponses.filter(r => r.attending === status);
}

function renderTable(responses) {
  const tbody = document.getElementById('responsesTableBody');
  const emptyState = document.getElementById('emptyState');

  if (responses.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = responses.map(r => `
    <tr data-id="${r.id}">
      <td><strong>${escapeHtml(r.guest_name)}</strong></td>
      <td>${escapeHtml(r.email || '-')}</td>
      <td><span class="status-badge status-${r.attending}">${formatStatus(r.attending)}</span></td>
      <td>${r.guest_count}</td>
      <td>${escapeHtml(r.dietary || '-')}</td>
      <td class="message-cell" title="${escapeHtml(r.message || '')}">${escapeHtml(r.message || '-')}</td>
      <td>${formatDate(r.created_at)}</td>
      <td>
        <button class="btn btn-danger delete-btn" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  // Add delete handlers
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteResponse(btn.dataset.id));
  });
}

function formatStatus(status) {
  const statusMap = {
    'yes': 'Attending',
    'no': 'Not Attending',
    'maybe': 'Maybe'
  };
  return statusMap[status] || status;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function deleteResponse(id) {
  if (!confirm('Are you sure you want to delete this response?')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/responses/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Password': adminPassword
      }
    });

    if (response.ok) {
      loadData();
    } else {
      alert('Failed to delete response');
    }
  } catch (error) {
    console.error('Error deleting response:', error);
    alert('Failed to delete response');
  }
}
