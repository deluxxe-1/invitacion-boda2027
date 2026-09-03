import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  collection,
  getDocs,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const sessionEmail = document.getElementById("sessionEmail");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");
const searchInput = document.getElementById("searchInput");
const attendanceFilter = document.getElementById("attendanceFilter");
const exportButton = document.getElementById("exportButton");
const statusText = document.getElementById("statusText");
const dashboardError = document.getElementById("dashboardError");
const responsesBody = document.getElementById("responsesBody");
const emptyState = document.getElementById("emptyState");
const summaryResponses = document.getElementById("summaryResponses");
const summaryConfirmed = document.getElementById("summaryConfirmed");
const summaryGuests = document.getElementById("summaryGuests");
const summaryChildren = document.getElementById("summaryChildren");

let auth = null;
let db = null;
let allRsvps = [];

if (!isFirebaseConfigured()) {
  showLoginError("La configuración de Firebase no está completa.");
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  setupAuthState();
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearLoginError();

  if (!auth) {
    showLoginError("No se ha podido iniciar Firebase Auth.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginError("Introduce tu correo y tu contraseña.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    passwordInput.value = "";
  } catch (error) {
    showLoginError(getFriendlyAuthError(error));
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Entrar";
  }
});

logoutButton?.addEventListener("click", async () => {
  if (!auth) return;
  await signOut(auth);
});

refreshButton?.addEventListener("click", async () => {
  await loadRsvps();
});

searchInput?.addEventListener("input", () => {
  renderRsvps();
});

attendanceFilter?.addEventListener("change", () => {
  renderRsvps();
});

exportButton?.addEventListener("click", () => {
  exportCsv(getFilteredRsvps());
});

function setupAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      sessionEmail.textContent = user.email ? `Sesión iniciada: ${user.email}` : "Sesión iniciada";
      loginView.classList.add("hidden");
      dashboardView.classList.remove("hidden");
      await loadRsvps();
      return;
    }

    allRsvps = [];
    responsesBody.innerHTML = "";
    updateSummary([]);
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    clearDashboardError();
    statusText.textContent = "Inicia sesión para cargar las respuestas.";
  });
}

async function loadRsvps() {
  if (!db) return;

  statusText.textContent = "Cargando respuestas...";
  clearDashboardError();
  refreshButton.disabled = true;
  exportButton.disabled = true;

  try {
    const snapshot = await getDocs(collection(db, "rsvps"));
    allRsvps = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));

    renderRsvps();
    statusText.textContent = `Respuestas cargadas: ${allRsvps.length}`;
  } catch (error) {
    showDashboardError(getFriendlyDashboardError(error));
    statusText.textContent = "No se han podido cargar las respuestas.";
  } finally {
    refreshButton.disabled = false;
    exportButton.disabled = allRsvps.length === 0;
  }
}

function renderRsvps() {
  const filtered = getFilteredRsvps();
  updateSummary(filtered);
  responsesBody.innerHTML = "";
  statusText.textContent = `Mostrando ${filtered.length} de ${allRsvps.length} respuestas`;

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    exportButton.disabled = filtered.length === 0;
    return;
  }

  emptyState.classList.add("hidden");
  exportButton.disabled = false;

  filtered.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <span class="admin-name">${escapeHtml(record.name || "Sin nombre")}</span>
        <span class="admin-subtext">${escapeHtml(getPartySummary(record))}</span>
      </td>
      <td>
        <span class="admin-badge ${record.attendanceConfirmed ? "admin-badge--yes" : "admin-badge--no"}">
          ${record.attendanceConfirmed ? "Asiste" : "No asiste"}
        </span>
      </td>
      <td>
        <span class="admin-name">${record.plusOneCount || 0}</span>
        <span class="admin-subtext">${escapeHtml(getCompanionSummary(record))}</span>
      </td>
      <td>
        <span class="admin-name">${record.childrenCount || 0}</span>
        <span class="admin-subtext">${escapeHtml(getChildrenSummary(record))}</span>
      </td>
      <td>
        <span class="admin-subtext">${escapeHtml(getDietarySummary(record))}</span>
      </td>
      <td>
        <span class="admin-subtext">${escapeHtml(getRouteSummary(record))}</span>
      </td>
      <td>
        <span class="admin-subtext">${escapeHtml(formatDate(record.createdAt))}</span>
      </td>
    `;
    responsesBody.appendChild(row);
  });
}

function getFilteredRsvps() {
  const searchTerm = normalizeText(searchInput?.value ?? "");
  const attendance = attendanceFilter?.value ?? "all";

  return allRsvps.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      normalizeText(record.name || "").includes(searchTerm) ||
      normalizeText(getCompanionSummary(record)).includes(searchTerm) ||
      normalizeText(getChildrenSummary(record)).includes(searchTerm);

    const matchesAttendance =
      attendance === "all" ||
      (attendance === "confirmed" && !!record.attendanceConfirmed) ||
      (attendance === "declined" && !record.attendanceConfirmed);

    return matchesSearch && matchesAttendance;
  });
}

function updateSummary(records) {
  const confirmedRecords = records.filter((record) => record.attendanceConfirmed);
  const guests = confirmedRecords.reduce((total, record) => total + getPartySize(record), 0);
  const children = confirmedRecords.reduce((total, record) => total + (record.childrenCount || 0), 0);

  summaryResponses.textContent = String(records.length);
  summaryConfirmed.textContent = String(confirmedRecords.length);
  summaryGuests.textContent = String(guests);
  summaryChildren.textContent = String(children);
}

function getPartySize(record) {
  if (!record.attendanceConfirmed) return 0;
  return 1 + (record.plusOneCount || 0) + (record.childrenCount || 0);
}

function getPartySummary(record) {
  if (!record.attendanceConfirmed) {
    return "No asistirá a la boda";
  }

  const companions = record.plusOneCount || 0;
  const children = record.childrenCount || 0;
  return `${getPartySize(record)} personas en total · ${companions} acompañantes · ${children} niños`;
}

function getCompanionSummary(record) {
  const details = Array.isArray(record.plusOneDetails) ? record.plusOneDetails : [];
  if (!details.length) return "Sin acompañantes";
  return details
    .map((detail) => detail.name || "Acompañante sin nombre")
    .join(", ");
}

function getChildrenSummary(record) {
  const details = Array.isArray(record.childrenDetails) ? record.childrenDetails : [];
  if (!details.length) return "Sin niños";

  return details
    .map((detail) => {
      const extras = [];
      if (detail.needsHighChair) extras.push("trona");
      if (detail.needsStroller) extras.push("carrito");
      return extras.length
        ? `${detail.name || "Niño sin nombre"} (${extras.join(", ")})`
        : detail.name || "Niño sin nombre";
    })
    .join(", ");
}

function getDietarySummary(record) {
  const notes = [];

  if (record.dietaryNotes) {
    notes.push(`Invitado principal: ${record.dietaryNotes}`);
  }

  (Array.isArray(record.plusOneDetails) ? record.plusOneDetails : []).forEach((detail) => {
    if (detail.dietaryNotes) {
      notes.push(`${detail.name || "Acompañante"}: ${detail.dietaryNotes}`);
    }
  });

  (Array.isArray(record.childrenDetails) ? record.childrenDetails : []).forEach((detail) => {
    if (detail.dietaryNotes) {
      notes.push(`${detail.name || "Niño"}: ${detail.dietaryNotes}`);
    }
  });

  return notes.length ? notes.join(" | ") : "Sin alergias indicadas";
}

function getRouteSummary(record) {
  const routes = Array.isArray(record.shuttleRoutes) ? record.shuttleRoutes : [];
  if (!routes.length) return "No necesita bus";

  return routes
    .map((route) => ({
      hotel_iglesia: "Hotel - Iglesia",
      iglesia_finca: "Iglesia - Finca",
      finca_hotel: "Finca - Hotel",
    }[route] || route))
    .join(", ");
}

function formatDate(timestamp) {
  const ms = getTimestampMs(timestamp);
  if (!ms) return "Sin fecha";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms);
}

function getTimestampMs(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  return 0;
}

function exportCsv(records) {
  if (!records.length) return;

  const headers = [
    "Nombre",
    "Asiste",
    "Invitados totales",
    "Acompañantes",
    "Detalle acompañantes",
    "Niños",
    "Detalle niños",
    "Alergias y restricciones",
    "Necesita bus",
    "Trayectos de bus",
    "Fecha de respuesta",
  ];

  const rows = records.map((record) => [
    record.name || "",
    record.attendanceConfirmed ? "Sí" : "No",
    String(getPartySize(record)),
    String(record.plusOneCount || 0),
    getCompanionSummary(record),
    String(record.childrenCount || 0),
    getChildrenSummary(record),
    getDietarySummary(record),
    (record.shuttleRoutes || []).length ? "Sí" : "No",
    getRouteSummary(record),
    formatDate(record.createdAt),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `rsvps-boda-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.remove("hidden");
}

function clearLoginError() {
  loginError.textContent = "";
  loginError.classList.add("hidden");
}

function showDashboardError(message) {
  dashboardError.textContent = message;
  dashboardError.classList.remove("hidden");
}

function clearDashboardError() {
  dashboardError.textContent = "";
  dashboardError.classList.add("hidden");
}

function getFriendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento y vuelve a probar.";
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    default:
      return "No se ha podido iniciar sesión. Revisa Firebase Auth y vuelve a intentarlo.";
  }
}

function getFriendlyDashboardError(error) {
  switch (error?.code) {
    case "permission-denied":
      return "Tu usuario ha iniciado sesión, pero no tiene permisos para leer Firestore.";
    default:
      return "No se han podido cargar las respuestas del panel.";
  }
}
