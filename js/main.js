import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const heroScene = document.getElementById("heroScene");
const heroIntroTrigger = document.getElementById("heroIntroTrigger");
const heroIntroVideo = document.getElementById("heroIntroVideo");
const invitationContent = document.getElementById("invitationContent");
const scrollHint = document.getElementById("scrollHint");

const countdownDays = document.getElementById("countdownDays");
const countdownHours = document.getElementById("countdownHours");
const countdownMinutes = document.getElementById("countdownMinutes");
const countdownSeconds = document.getElementById("countdownSeconds");

const navUp = document.getElementById("navUp");
const navDown = document.getElementById("navDown");
const musicToggle = document.getElementById("musicToggle");
const calendarBtn = document.getElementById("calendarBtn");
const lodgingForm = document.getElementById("lodgingForm");
const lodgingCodePanel = document.getElementById("lodgingCodePanel");
const lodgingCodeValue = document.getElementById("lodgingCodeValue");

const rsvpForm = document.getElementById("rsvpForm");
const submitBtn = document.getElementById("submitBtn");
const rsvpSuccess = document.getElementById("rsvpSuccess");
const rsvpError = document.getElementById("rsvpError");
const rsvpErrorText = document.getElementById("rsvpErrorText");
const dietaryGroup = document.getElementById("dietaryGroup");
const plusOneGroup = document.getElementById("plusOneGroup");
const plusOneCountGroup = document.getElementById("plusOneCountGroup");
const plusOneCountInput = document.getElementById("plusOneCount");
const childrenGroup = document.getElementById("childrenGroup");
const childrenCountGroup = document.getElementById("childrenCountGroup");
const childrenCountInput = document.getElementById("childrenCount");
const shuttleGroup = document.getElementById("shuttleGroup");

let db = null;
const collapsibleTimers = new WeakMap();
let currentLodgingCode = "";
let heroIntroPlayed = false;
let heroIntroFinished = false;
let heroIntroPreviewPrepared = false;

if (heroScene) {
  document.body.classList.add("intro-pending");
}

if (isFirebaseConfigured()) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

function getRadioValue(name) {
  return rsvpForm?.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
}

function getExpandedHeight(element) {
  const previousMaxHeight = element.style.maxHeight;
  if (previousMaxHeight === "none") {
    element.style.maxHeight = "";
  }
  const height = element.scrollHeight;
  element.style.maxHeight = previousMaxHeight;
  return height;
}

function setControlsDisabled(element, disabled) {
  element.querySelectorAll("input, textarea, select, button").forEach((control) => {
    control.disabled = disabled;
  });
}

function resetCheckboxGroup(name) {
  rsvpForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = false;
  });
}

function generateLodgingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `HOTEL-DS27-${suffix}`;
}

function syncLodgingState() {
  const lodgingNeeded =
    lodgingForm?.querySelector('input[name="lodgingNeeded"]:checked')?.value ?? "";

  if (lodgingNeeded === "si") {
    if (!currentLodgingCode) {
      currentLodgingCode = generateLodgingCode();
    }
    lodgingCodeValue.textContent = currentLodgingCode;
    lodgingCodePanel.classList.remove("hidden");
    return;
  }

  lodgingCodePanel.classList.add("hidden");
  currentLodgingCode = "";
}

function setCollapsibleState(element, shouldShow) {
  if (!element) return;
  const isCollapsed = element.classList.contains("is-collapsed");
  const isAlreadyVisible = !isCollapsed;

  if (shouldShow === isAlreadyVisible) {
    if (shouldShow) {
      element.removeAttribute("aria-hidden");
      element.inert = false;
      setControlsDisabled(element, false);
      if (!element.style.maxHeight || element.style.maxHeight !== "none") {
        element.style.maxHeight = "none";
      }
    } else {
      element.setAttribute("aria-hidden", "true");
      element.inert = true;
      setControlsDisabled(element, true);
      if (element.style.maxHeight !== "0px") {
        element.style.maxHeight = "0px";
      }
    }
    return;
  }

  const activeTimer = collapsibleTimers.get(element);
  if (activeTimer) {
    window.clearTimeout(activeTimer);
  }

  const expandedHeight = getExpandedHeight(element);

  if (shouldShow) {
    element.removeAttribute("aria-hidden");
    element.inert = false;
    setControlsDisabled(element, false);
    element.classList.remove("is-collapsed");
    element.style.maxHeight = "0px";

    requestAnimationFrame(() => {
      element.style.maxHeight = `${expandedHeight}px`;
    });

    const timer = window.setTimeout(() => {
      if (!element.classList.contains("is-collapsed")) {
        element.style.maxHeight = "none";
      }
    }, 700);

    collapsibleTimers.set(element, timer);
    return;
  }

  element.setAttribute("aria-hidden", "true");
  element.inert = true;
  setControlsDisabled(element, true);

  if (element.style.maxHeight === "none") {
    element.style.maxHeight = `${expandedHeight}px`;
  } else {
    element.style.maxHeight = `${Math.max(expandedHeight, 0)}px`;
  }

  requestAnimationFrame(() => {
    element.classList.add("is-collapsed");
    element.style.maxHeight = "0px";
  });
}

function openInvitationAfterVideo() {
  if (heroIntroFinished) return;
  heroIntroFinished = true;
  heroScene?.classList.add("is-hidden");
  document.body.classList.remove("intro-pending");
  document.body.classList.add("intro-complete");

  window.setTimeout(() => {
    if (heroScene) {
      heroScene.hidden = true;
    }
  }, 300);

  window.setTimeout(() => {
    invitationContent?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 160);
}

function prepareHeroIntroPreview() {
  if (!heroIntroVideo || heroIntroPreviewPrepared) return;
  heroIntroPreviewPrepared = true;

  const previewTime = 0.05;
  heroIntroVideo.pause();

  try {
    heroIntroVideo.currentTime = previewTime;
  } catch (error) {
    console.error("No se ha podido preparar la vista previa del video:", error);
  }
}

async function playHeroIntro() {
  if (!heroIntroVideo || heroIntroPlayed) return;

  heroIntroPlayed = true;
  heroIntroTrigger?.classList.add("is-playing");
  scrollHint?.classList.add("hidden");

  try {
    heroIntroVideo.currentTime = 0;
    heroIntroVideo.pause();
    await heroIntroVideo.play();
  } catch (error) {
    heroIntroPlayed = false;
    heroIntroTrigger?.classList.remove("is-playing");
    scrollHint?.classList.remove("hidden");
    console.error("No se ha podido reproducir el video de inicio:", error);
  }
}

function updateCountdown() {
  const targetDate = new Date("2027-06-12T16:30:00+02:00").getTime();
  const now = Date.now();
  const distance = Math.max(targetDate - now, 0);

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  countdownDays.textContent = String(days).padStart(3, "0");
  countdownHours.textContent = String(hours).padStart(2, "0");
  countdownMinutes.textContent = String(minutes).padStart(2, "0");
  countdownSeconds.textContent = String(seconds).padStart(2, "0");
}

function setupRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function resetRadioGroup(name) {
  rsvpForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = false;
  });
}

function syncRsvpState() {
  const attendance = getRadioValue("attendance");
  const attends = attendance === "si";
  const plusOne = getRadioValue("plusOne");
  const children = getRadioValue("children");

  setCollapsibleState(dietaryGroup, attends);
  setCollapsibleState(plusOneGroup, attends);
  setCollapsibleState(childrenGroup, attends);
  setCollapsibleState(shuttleGroup, attends);

  if (!attends) {
    resetRadioGroup("plusOne");
    resetRadioGroup("children");
    resetCheckboxGroup("shuttleRoutes");
    plusOneCountInput.value = "";
    childrenCountInput.value = "";
    setCollapsibleState(plusOneCountGroup, false);
    setCollapsibleState(childrenCountGroup, false);
    return;
  }

  const hasPlusOne = plusOne === "si";
  setCollapsibleState(plusOneCountGroup, hasPlusOne);
  if (!hasPlusOne) {
    plusOneCountInput.value = "";
  }

  const hasChildren = children === "si";
  setCollapsibleState(childrenCountGroup, hasChildren);
  if (!hasChildren) {
    childrenCountInput.value = "";
  }
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
  const name = formData.get("fullName")?.toString().trim() ?? "";
  const attendance = formData.get("attendance")?.toString() ?? "";
  const dietaryNotes = formData.get("dietaryNotes")?.toString().trim() ?? "";
  const plusOne = formData.get("plusOne")?.toString() ?? "";
  const plusOneCount = Number.parseInt(formData.get("plusOneCount")?.toString() ?? "", 10);
  const children = formData.get("children")?.toString() ?? "";
  const childrenCount = Number.parseInt(formData.get("childrenCount")?.toString() ?? "", 10);
  const shuttleRoutes = formData.getAll("shuttleRoutes").map((route) => route.toString());

  if (!name) {
    showError("Por favor, escribe tu nombre completo.");
    return;
  }

  if (!attendance) {
    showError("Confirmanos si asistiras a la boda.");
    return;
  }

  const attends = attendance === "si";

  if (attends && !plusOne) {
    showError("Indicanos si vendras con acompanante.");
    return;
  }

  if (attends && plusOne === "si" && (!Number.isInteger(plusOneCount) || plusOneCount < 1)) {
    showError("Indicanos cuantos acompanantes asistiran contigo.");
    return;
  }

  if (attends && !children) {
    showError("Indicanos si asistiran ninos menores de 12 anos.");
    return;
  }

  if (attends && children === "si" && (!Number.isInteger(childrenCount) || childrenCount < 1)) {
    showError("Indicanos cuantos ninos menores de 12 anos asistiran.");
    return;
  }

  if (!isFirebaseConfigured() || !db) {
    showError("Firebase no esta configurado correctamente.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  const rsvpData = {
    name,
    attendanceConfirmed: attends,
    dietaryNotes: attends ? dietaryNotes : "",
    plusOne: attends ? plusOne === "si" : false,
    plusOneCount: attends && plusOne === "si" ? plusOneCount : 0,
    bringingChildrenUnder12: attends ? children === "si" : false,
    childrenCount: attends && children === "si" ? childrenCount : 0,
    shuttleRoutes: attends ? shuttleRoutes : [],
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "rsvps"), rsvpData);
    rsvpForm.classList.add("hidden");
    rsvpSuccess.classList.remove("hidden");
  } catch (error) {
    console.error("Error al guardar la confirmacion:", error);
    showError("No hemos podido guardar tu confirmacion. Intentalo otra vez.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar asistencia";
  }
}

function createCalendarFile() {
  const calendarContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Diego y Silvia//Boda 2027//ES",
    "BEGIN:VEVENT",
    "UID:diego-silvia-20270612@boda-2027",
    "DTSTAMP:20260619T120000Z",
    "DTSTART:20270612T143000Z",
    "DTEND:20270613T010000Z",
    "SUMMARY:Boda de Diego y Silvia",
    "DESCRIPTION:Celebracion en Finca Villa Laureana",
    "LOCATION:Finca Villa Laureana, Madrid, Espana",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([calendarContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "diego-silvia-save-the-date.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

let audioContext = null;
let masterGain = null;
let musicInterval = null;
let musicEnabled = false;
let noteIndex = 0;

const sequence = [
  [261.63, 329.63, 392.0],
  [293.66, 349.23, 440.0],
  [329.63, 392.0, 493.88],
  [293.66, 369.99, 440.0],
];

function playPianoTone(frequency, time, duration) {
  if (!audioContext || !masterGain) return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency, time);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1700, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.11, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function scheduleMusicStep() {
  const now = audioContext.currentTime;
  const chord = sequence[noteIndex % sequence.length];
  chord.forEach((frequency, index) => {
    playPianoTone(frequency, now + index * 0.06, 1.4);
  });
  noteIndex += 1;
}

function stopMusic() {
  if (musicInterval) {
    window.clearInterval(musicInterval);
    musicInterval = null;
  }
  if (masterGain && audioContext) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
  }
  musicEnabled = false;
  musicToggle.querySelector(".floating-ui__label").textContent = "Musica";
  musicToggle.setAttribute("aria-label", "Activar musica");
}

async function startMusic() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.08;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  scheduleMusicStep();
  musicInterval = window.setInterval(scheduleMusicStep, 2100);
  musicEnabled = true;
  musicToggle.querySelector(".floating-ui__label").textContent = "Silenciar";
  musicToggle.setAttribute("aria-label", "Silenciar musica");
}

function handleMusicToggle() {
  if (musicEnabled) {
    stopMusic();
  } else {
    startMusic();
  }
}

function scrollByViewport(direction) {
  window.scrollBy({
    top: window.innerHeight * 0.82 * direction,
    behavior: "smooth",
  });
}

function setupInteractions() {
  heroIntroVideo?.addEventListener("loadeddata", prepareHeroIntroPreview, { once: true });
  heroIntroTrigger?.addEventListener("click", playHeroIntro);
  heroIntroVideo?.addEventListener("ended", openInvitationAfterVideo);
  scrollHint?.addEventListener("click", playHeroIntro);
  navUp?.addEventListener("click", () => scrollByViewport(-1));
  navDown?.addEventListener("click", () => scrollByViewport(1));
  musicToggle?.addEventListener("click", handleMusicToggle);
  calendarBtn?.addEventListener("click", createCalendarFile);
  lodgingForm
    ?.querySelectorAll('input[name="lodgingNeeded"]')
    .forEach((input) => input.addEventListener("change", syncLodgingState));

  rsvpForm?.addEventListener("submit", handleRsvpSubmit);
  [
    "attendance",
    "plusOne",
    "children",
    "shuttleRoutes",
  ].forEach((name) => {
    rsvpForm?.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.addEventListener("change", syncRsvpState);
    });
  });
}

setupRevealAnimations();
setupInteractions();
syncLodgingState();
syncRsvpState();
updateCountdown();
window.setInterval(updateCountdown, 1000);
