const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const deleteFaceBtn = document.getElementById('deleteFaceBtn');
const facesList = document.getElementById('facesList');

export const API_BASE = 'http://localhost:3001/api'; // Change port if needed

// 🆕 Generic function to call backend API
export async function sendToAPI(endpoint, payload) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await res.json();
  } catch (err) {
    console.error(`❌ API error on ${endpoint}:`, err);
    return { error: err.message };
  }
}

// ✅ Download attendance log from localStorage
if (downloadCsvBtn) {
  downloadCsvBtn.addEventListener('click', () => {
    const log = JSON.parse(localStorage.getItem('attendanceLog') || '[]');
    if (log.length === 0) {
      alert("No attendance logs yet.");
      return;
    }

    const headers = "Name,Time\n";
    const rows = log.map(entry => `${entry.name},${entry.time}`).join("\n");
    const csv = headers + rows;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  });
}

// ✅ Delete a user by name
if (deleteFaceBtn) {
  deleteFaceBtn.addEventListener('click', async () => {
    const nameToDelete = document.getElementById('deleteName')?.value.trim().toLowerCase();
    if (!nameToDelete) {
      alert("Please enter a name to delete.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/user/${encodeURIComponent(nameToDelete)}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (res.ok) {
        alert(`✅ Deleted "${nameToDelete}" from database.`);
        refreshRegisteredFaces();
      } else {
        alert(`❌ Failed to delete: ${result.error}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Could not connect to backend.");
    }
  });
}

// ✅ Refresh face list from MongoDB
export async function refreshRegisteredFaces() {
  if (!facesList) return;
  facesList.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/users`);
    const users = await res.json();

    users.forEach(user => {
      const container = document.createElement('div');
      container.style.marginBottom = '16px';
      container.innerHTML = `<strong>${user.name}</strong><br/>`;

      if (user.snapshots?.length) {
        user.snapshots.forEach((base64, i) => {
          const img = document.createElement('img');
          img.src = base64;
          img.alt = `${user.name} photo ${i + 1}`;
          img.style.width = '100px';
          img.style.marginRight = '6px';
          img.style.border = '1px solid #ccc';
          container.appendChild(img);
        });
      } else {
        container.innerHTML += '<em>(No saved snapshots)</em>';
      }

      facesList.appendChild(container);
    });

  } catch (err) {
    console.error("Failed to fetch users:", err);
    alert("❌ Could not fetch face data from backend.");
  }
}
