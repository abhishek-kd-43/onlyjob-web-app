// Save profile
function saveProfile() {
  const email = document.querySelector('input[type="email"]').value;
  const phone = document.querySelector('input[type="tel"]').value;

  if (!email || !phone) {
    alert("Email & WhatsApp required!");
    return;
  }

  localStorage.setItem("userEmail", email);
  localStorage.setItem("userPhone", phone);

  alert("Profile Saved!");
}

// Apply job
function applyNow(jobName, link) {
  let apps = JSON.parse(localStorage.getItem("applications") || "[]");

  apps.push({
    job: jobName,
    status: "Applied",
    date: new Date().toLocaleDateString()
  });

  localStorage.setItem("applications", JSON.stringify(apps));

  window.location.href = link;
}

// Load applications
function loadApplications() {
  let apps = JSON.parse(localStorage.getItem("applications") || "[]");

  const container = document.getElementById("apps");

  if (!container) return;

  apps.forEach(app => {
    container.innerHTML += `
      <div class="card p-3 mb-3 bg-white rounded">
        ${app.job} - ${app.date}
      </div>
    `;
  });
}
