import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const envelopeFlap = document.getElementById("envelopeFlap");
const letter = document.getElementById("letter");
const envelopeScene = document.getElementById("envelopeScene");
const scrollHint = document.getElementById("scrollHint");
const scrollDriver = document.getElementById("scrollDriver");
const invitation = document.getElementById("invitation");
const rsvpForm = document.getElementById("rsvpForm");
const submitBtn = document.getElementById("submitBtn");
const rsvpSuccess = document.getElementById("rsvpSuccess");
const rsvpError = document.getElementById("rsvpError");
const rsvpErrorText = document.getElementById("rsvpErrorText");
const guestsGroup = document.getElementById("guestsGroup");

let db = null;

if (isFirebaseConfigured()) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function updateEnvelopeAnimation() {
  const driverRect = scrollDriver.getBoundingClientRect();
  const driverTop = driverRect.top + window.scrollY;
  const driverHeight = scrollDriver.offsetHeight;
  const scrollY = window.scrollY;

  const rawProgress = (scrollY - driverTop + window.innerHeight * 0.5) / driverHeight;
  const progress = clamp(rawProgress, 0, 1);

  const flapProgress = clamp(progress / 0.55, 0, 1);
  const letterProgress = clamp((progress - 0.35) / 0.45, 0, 1);
  const fadeProgress = clamp((progress - 0.75) / 0.25, 0, 1);

  const flapRotation = easeOutCubic(flapProgress) * 180;
  envelopeFlap.style.transform = `rotateX(${flapRotation}deg)`;

  const letterY = easeOutCubic(letterProgress) * -120;
  const letterScale = 1 + easeOutCubic(letterProgress) * 0.08;
  letter.style.transform = `translateY(${letterY}%) scale(${letterScale})`;

  if (flapProgress > 0.3) {
    envelopeFlap.querySelector(".envelope__seal").style.opacity = String(
      1 - clamp((flapProgress - 0.3) / 0.4, 0, 1)
    );
  }

  scrollHint.classList.toggle("is-hidden", progress > 0.08);

  if (fadeProgress >= 1) {
    envelopeScene.classList.add("is-hidden");
  } else {
    envelopeScene.classList.remove("is-hidden");
    envelopeScene.style.opacity = String(1 - fadeProgress);
  }

  invitation.style.opacity = String(clamp((progress - 0.6) / 0.3, 0, 1));
}

function handleAttendanceChange() {
  const selected = rsvpForm.querySelector('input[name="attendance"]:checked');
  const isNotAttending = selected?.value === "no_asiste";
  guestsGroup.classList.toggle("hidden", isNotAttending);
}

function showError(message) {
  rsvpErrorText.textContent = message;
  rsvpError.classList.remove("hidden");
}

function hideError() {
  rsvpError.classList.add("hidden");
}

async function handleRsvpSubmit(event) {
  event.preventDefault();
  hideError();

  const formData = new FormData(rsvpForm);
  const name = formData.get("guestName")?.toString().trim();
  const email = formData.get("guestEmail")?.toString().trim() || "";
  const phone = formData.get("guestPhone")?.toString().trim() || "";
  const attendance = formData.get("attendance")?.toString();
  const guestCount = parseInt(formData.get("guestCount")?.toString() || "1", 10);
  const dietaryNotes = formData.get("dietaryNotes")?.toString().trim() || "";
  const message = formData.get("message")?.toString().trim() || "";

  if (!name) {
    showError("Por favor, escribe tu nombre.");
    return;
  }

  if (!attendance) {
    showError("Por favor, indica a qué asistirás.");
    return;
  }

  if (!isFirebaseConfigured() || !db) {
    showError(
      "Firebase no está configurado todavía. Edita js/firebase-config.js con tus credenciales."
    );
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando…";

  try {
    await addDoc(collection(db, "rsvps"), {
      name,
      email,
      phone,
      attendance,
      guestCount: attendance === "no_asiste" ? 0 : guestCount,
      dietaryNotes,
      message,
      createdAt: serverTimestamp(),
    });

    rsvpForm.classList.add("hidden");
    rsvpSuccess.classList.remove("hidden");
  } catch (error) {
    console.error("Error al enviar RSVP:", error);
    showError("No se pudo enviar la confirmación. Inténtalo de nuevo.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar confirmación";
  }
}

rsvpForm.addEventListener("submit", handleRsvpSubmit);
rsvpForm.querySelectorAll('input[name="attendance"]').forEach((radio) => {
  radio.addEventListener("change", handleAttendanceChange);
});

window.addEventListener("scroll", updateEnvelopeAnimation, { passive: true });
window.addEventListener("resize", updateEnvelopeAnimation, { passive: true });

updateEnvelopeAnimation();
handleAttendanceChange();
