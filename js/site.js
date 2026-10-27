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
const heroTransitionVideo = document.getElementById("heroTransitionVideo");
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

const rsvpForm = document.getElementById("rsvpForm");
const submitBtn = document.getElementById("submitBtn");
const rsvpSuccess = document.getElementById("rsvpSuccess");
const rsvpError = document.getElementById("rsvpError");
const rsvpErrorText = document.getElementById("rsvpErrorText");
const dietaryGroup = document.getElementById("dietaryGroup");
const dietaryNotesGroup = document.getElementById("dietaryNotesGroup");
const dietaryNotesInput = document.getElementById("dietaryNotes");
const plusOneGroup = document.getElementById("plusOneGroup");
const plusOneCountGroup = document.getElementById("plusOneCountGroup");
const plusOneCountInput = document.getElementById("plusOneCount");
const plusOneDetailsGroup = document.getElementById("plusOneDetailsGroup");
const plusOneDetailsFields = document.getElementById("plusOneDetailsFields");
const childrenGroup = document.getElementById("childrenGroup");
const childrenCountGroup = document.getElementById("childrenCountGroup");
const childrenCountInput = document.getElementById("childrenCount");
const childrenDetailsGroup = document.getElementById("childrenDetailsGroup");
const childrenDetailsFields = document.getElementById("childrenDetailsFields");
const shuttleGroup = document.getElementById("shuttleGroup");
const weddingSong = new Audio("/music/wedding-song.mp3");
const HERO_INTRO_FALLBACK_MS = 5200;
const HERO_TRANSITION_FALLBACK_MS = 2200;

let db = null;
const collapsibleTimers = new WeakMap();
let heroIntroPlayed = false;
let heroIntroFinished = false;
let heroIntroPreviewPrepared = false;
let heroTransitionCompleted = false;
let heroIntroFallbackTimer = null;
let heroTransitionFallbackTimer = null;

if (heroScene) {
  document.body.classList.add("intro-pending");
}

if (isFirebaseConfigured()) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function setHeroIntroSource(source) {
  if (!heroIntroVideo || !source) return;
  if (heroIntroVideo.getAttribute("src") === source) return;

  heroIntroVideo.setAttribute("src", source);
  heroIntroVideo.load();
}

function useDefaultHeroIntroSource() {
  const defaultSource = heroIntroVideo?.dataset.defaultSrc;
  if (!defaultSource) return;
  setHeroIntroSource(defaultSource);
}

function configureHeroIntroSource() {
  if (!heroIntroVideo) return;

  const iosSource = heroIntroVideo.dataset.iosSrc;
  if (isIOSDevice() && iosSource) {
    setHeroIntroSource(iosSource);
    return;
  }

  useDefaultHeroIntroSource();
}

function clearHeroIntroFallback() {
  if (heroIntroFallbackTimer) {
    window.clearTimeout(heroIntroFallbackTimer);
    heroIntroFallbackTimer = null;
  }
}

function scheduleHeroIntroFallback() {
  clearHeroIntroFallback();
  heroIntroFallbackTimer = window.setTimeout(() => {
    if (!heroIntroFinished) {
      console.warn("Fallback de la intro activado: se abre la invitación sin esperar al vídeo.");
      openInvitationAfterVideo();
    }
  }, HERO_INTRO_FALLBACK_MS);
}

function clearHeroTransitionFallback() {
  if (heroTransitionFallbackTimer) {
    window.clearTimeout(heroTransitionFallbackTimer);
    heroTransitionFallbackTimer = null;
  }
}

function scheduleHeroTransitionFallback() {
  clearHeroTransitionFallback();
  heroTransitionFallbackTimer = window.setTimeout(() => {
    if (!heroTransitionCompleted) {
      console.warn("Fallback de transición activado: se muestra la invitación.");
      revealInvitationAfterTransition();
    }
  }, HERO_TRANSITION_FALLBACK_MS);
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

function updateDependentCountOptions(selectElement, maxCount, singularLabel, pluralLabel) {
  if (!selectElement) return;

  const previousValue = selectElement.value;
  selectElement.innerHTML = '<option value="">Selecciona una cantidad</option>';

  for (let count = 1; count <= maxCount; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = `${count} ${count === 1 ? singularLabel : pluralLabel}`;
    selectElement.appendChild(option);
  }

  if (previousValue && Number.parseInt(previousValue, 10) <= maxCount) {
    selectElement.value = previousValue;
  }
}

function syncLodgingState() {
  const lodgingNeeded =
    lodgingForm?.querySelector('input[name="lodgingNeeded"]:checked')?.value ?? "";

  if (lodgingNeeded === "si") {
    lodgingCodePanel.classList.remove("hidden");
    return;
  }

  lodgingCodePanel.classList.add("hidden");
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

function revealInvitationAfterTransition() {
  if (heroTransitionCompleted) return;
  heroTransitionCompleted = true;
  clearHeroTransitionFallback();

  heroTransitionVideo?.pause();
  heroScene?.classList.add("is-hidden");
  document.body.classList.remove("intro-pending");
  document.body.classList.add("intro-complete");

  if (invitationContent) {
    invitationContent.classList.add("intro-reveal");
  }

  window.setTimeout(() => {
    if (heroScene) {
      heroScene.style.display = "none";
    }
    if (heroTransitionVideo) {
      heroTransitionVideo.classList.remove("is-active");
      heroTransitionVideo.style.display = "none";
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    if (invitationContent) {
      invitationContent.scrollIntoView({ behavior: "smooth" });
    }
  }, 700);
}

async function playTransitionVideo() {
  if (!heroTransitionVideo) {
    revealInvitationAfterTransition();
    return;
  }

  scheduleHeroTransitionFallback();
  heroTransitionVideo.classList.add("is-active");

  const finishTransition = () => {
    heroTransitionVideo.removeEventListener("ended", finishTransition);
    revealInvitationAfterTransition();
  };

  heroTransitionVideo.addEventListener("ended", finishTransition, { once: true });

  try {
    heroTransitionVideo.currentTime = 0;
    await heroTransitionVideo.play();
  } catch (error) {
    console.error("No se ha podido reproducir el vídeo de transición:", error);
    revealInvitationAfterTransition();
  }
}

function openInvitationAfterVideo() {
  if (heroIntroFinished) return;
  heroIntroFinished = true;
  clearHeroIntroFallback();
  heroIntroVideo?.pause();
  startMusic().catch((error) => {
    console.error("No se ha podido iniciar la música automáticamente:", error);
  });
  playTransitionVideo();
}

function prepareHeroIntroPreview() {
  if (!heroIntroVideo || heroIntroPreviewPrepared) return;
  heroIntroPreviewPrepared = true;

  const previewTime = 0.05;
  heroIntroVideo.pause();

  try {
    heroIntroVideo.currentTime = previewTime;
  } catch (error) {
    console.error("No se ha podido preparar la vista previa del vídeo:", error);
  }

  heroIntroVideo.load();
}

async function playHeroIntro() {
  if (!heroIntroVideo || heroIntroPlayed) return;

  heroIntroPlayed = true;
  heroIntroTrigger?.classList.add("is-playing");
  scrollHint?.classList.add("hidden");
  scheduleHeroIntroFallback();

  try {
    await primeWeddingSong();
    heroIntroVideo.currentTime = 0;
    heroIntroVideo.pause();
    await heroIntroVideo.play();
  } catch (error) {
    console.error("No se ha podido reproducir el vídeo de inicio:", error);
    openInvitationAfterVideo();
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

function setupPhotoIntroState() {
  if (!invitationContent) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      const shouldHideFloatingUi = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      document.body.classList.toggle("photo-intro-active", shouldHideFloatingUi);
    },
    {
      threshold: [0, 0.45, 0.7],
    }
  );

  observer.observe(invitationContent);
}

function resetRadioGroup(name) {
  rsvpForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = false;
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getDynamicTextValue(container, selector) {
  return container?.querySelector(selector)?.value?.trim() ?? "";
}

function getCheckedDataFieldValue(container, fieldName) {
  return container?.querySelector(`[data-field="${fieldName}"]:checked`)?.value ?? "";
}

function isCheckboxChecked(container, selector) {
  return container?.querySelector(selector)?.checked ?? false;
}

function getCompanionDetailsFromDom() {
  return Array.from(plusOneDetailsFields?.querySelectorAll("[data-companion-item]") ?? []).map((item) => ({
    name: getDynamicTextValue(item, '[data-field="name"]'),
    dietaryNeeds: getCheckedDataFieldValue(item, "dietaryNeeds"),
    dietaryNotes:
      getCheckedDataFieldValue(item, "dietaryNeeds") === "si"
        ? getDynamicTextValue(item, '[data-field="dietaryNotes"]')
        : "",
  }));
}

function getChildDetailsFromDom() {
  return Array.from(childrenDetailsFields?.querySelectorAll("[data-child-item]") ?? []).map((item) => ({
    name: getDynamicTextValue(item, '[data-field="name"]'),
    dietaryNeeds: getCheckedDataFieldValue(item, "dietaryNeeds"),
    dietaryNotes:
      getCheckedDataFieldValue(item, "dietaryNeeds") === "si"
        ? getDynamicTextValue(item, '[data-field="dietaryNotes"]')
        : "",
    needsHighChair: isCheckboxChecked(item, '[data-field="needsHighChair"]'),
    needsStroller: isCheckboxChecked(item, '[data-field="needsStroller"]'),
  }));
}

function syncDynamicDietaryState(detailCard) {
  if (!detailCard) return;

  const dietaryNotesContainer = detailCard.querySelector('[data-role="dietaryNotesGroup"]');
  const needsDietaryNotes = getCheckedDataFieldValue(detailCard, "dietaryNeeds") === "si";

  if (!needsDietaryNotes) {
    const dietaryTextarea = dietaryNotesContainer?.querySelector('[data-field="dietaryNotes"]');
    if (dietaryTextarea) {
      dietaryTextarea.value = "";
    }
  }

  setCollapsibleState(dietaryNotesContainer, needsDietaryNotes);
}

function renderCompanionDetails(count) {
  if (!plusOneDetailsFields) return;

  const previousDetails = getCompanionDetailsFromDom();
  plusOneDetailsFields.innerHTML = "";

  if (!Number.isInteger(count) || count < 1) {
    return;
  }

  plusOneDetailsFields.innerHTML = Array.from({ length: count }, (_, index) => {
    const detail = previousDetails[index] ?? { name: "", dietaryNeeds: "", dietaryNotes: "" };
    const hasDietaryNotes = detail.dietaryNeeds === "si" || Boolean(detail.dietaryNotes);
    return `
      <div class="detail-card" data-companion-item>
        <p class="detail-card__title">Acompañante ${index + 1}</p>
        <div class="form-field">
          <label for="plusOneName${index}">Nombre del acompañante *</label>
          <input
            id="plusOneName${index}"
            data-field="name"
            type="text"
            maxlength="100"
            autocomplete="off"
            placeholder="Nombre y apellidos"
            value="${escapeHtml(detail.name)}">
        </div>
        <fieldset class="choice-group choice-group--compact">
          <legend>¿Tiene alergias o restricciones alimentarias? *</legend>
          <div class="choice-grid choice-grid--2">
            <label class="choice-card">
              <input
                data-field="dietaryNeeds"
                type="radio"
                name="plusOneDietaryNeeds${index}"
                value="si"
                ${hasDietaryNotes ? "checked" : ""}>
              <span>Si</span>
            </label>
            <label class="choice-card">
              <input
                data-field="dietaryNeeds"
                type="radio"
                name="plusOneDietaryNeeds${index}"
                value="no"
                ${detail.dietaryNeeds === "no" ? "checked" : ""}>
              <span>No</span>
            </label>
          </div>
        </fieldset>
        <div class="form-field ${hasDietaryNotes ? "" : "is-collapsed"}" data-role="dietaryNotesGroup">
          <label for="plusOneDietaryNotes${index}">Cuéntanos cuáles son sus alergias o restricciones *</label>
          <textarea
            id="plusOneDietaryNotes${index}"
            data-field="dietaryNotes"
            rows="2"
            maxlength="300"
            placeholder="Escribe aquí sus alergias o restricciones">${escapeHtml(detail.dietaryNotes)}</textarea>
        </div>
      </div>
    `;
  }).join("");

  plusOneDetailsFields.querySelectorAll("[data-companion-item]").forEach(syncDynamicDietaryState);
}

function renderChildDetails(count) {
  if (!childrenDetailsFields) return;

  const previousDetails = getChildDetailsFromDom();
  childrenDetailsFields.innerHTML = "";

  if (!Number.isInteger(count) || count < 1) {
    return;
  }

  childrenDetailsFields.innerHTML = Array.from({ length: count }, (_, index) => {
    const detail = previousDetails[index] ?? {
      name: "",
      dietaryNeeds: "",
      dietaryNotes: "",
      needsHighChair: false,
      needsStroller: false,
    };
    const hasDietaryNotes = detail.dietaryNeeds === "si" || Boolean(detail.dietaryNotes);

    return `
      <div class="detail-card" data-child-item>
        <p class="detail-card__title">Niño ${index + 1}</p>
        <div class="form-field">
          <label for="childName${index}">Nombre del niño *</label>
          <input
            id="childName${index}"
            data-field="name"
            type="text"
            maxlength="100"
            autocomplete="off"
            placeholder="Nombre del niño"
            value="${escapeHtml(detail.name)}">
        </div>
        <fieldset class="choice-group choice-group--compact">
          <legend>¿Tiene alergias o restricciones alimentarias? *</legend>
          <div class="choice-grid choice-grid--2">
            <label class="choice-card">
              <input
                data-field="dietaryNeeds"
                type="radio"
                name="childDietaryNeeds${index}"
                value="si"
                ${hasDietaryNotes ? "checked" : ""}>
              <span>Si</span>
            </label>
            <label class="choice-card">
              <input
                data-field="dietaryNeeds"
                type="radio"
                name="childDietaryNeeds${index}"
                value="no"
                ${detail.dietaryNeeds === "no" ? "checked" : ""}>
              <span>No</span>
            </label>
          </div>
        </fieldset>
        <div class="form-field ${hasDietaryNotes ? "" : "is-collapsed"}" data-role="dietaryNotesGroup">
          <label for="childDietaryNotes${index}">Cuéntanos cuáles son sus alergias o restricciones *</label>
          <textarea
            id="childDietaryNotes${index}"
            data-field="dietaryNotes"
            rows="2"
            maxlength="300"
            placeholder="Escribe aquí sus alergias o restricciones">${escapeHtml(detail.dietaryNotes)}</textarea>
        </div>
        <div class="detail-card__options">
          <label class="choice-card choice-card--checkbox">
            <input type="checkbox" data-field="needsHighChair" ${detail.needsHighChair ? "checked" : ""}>
            <span>Necesita trona</span>
          </label>
          <label class="choice-card choice-card--checkbox">
            <input type="checkbox" data-field="needsStroller" ${detail.needsStroller ? "checked" : ""}>
            <span>Necesita carrito</span>
          </label>
        </div>
      </div>
    `;
  }).join("");

  childrenDetailsFields.querySelectorAll("[data-child-item]").forEach(syncDynamicDietaryState);
}

function syncRsvpState() {
  const attendance = getRadioValue("attendance");
  const attends = attendance === "si";
  const dietaryNeeds = getRadioValue("dietaryNeeds");
  const plusOne = getRadioValue("plusOne");
  const children = getRadioValue("children");
  const plusOneCount = Number.parseInt(plusOneCountInput.value ?? "", 10);
  const childrenCount = Number.parseInt(childrenCountInput.value ?? "", 10);
  const hasValidPlusOneCount = Number.isInteger(plusOneCount) && plusOneCount > 0;
  const hasValidChildrenCount = Number.isInteger(childrenCount) && childrenCount > 0;

  setCollapsibleState(dietaryGroup, attends);
  setCollapsibleState(dietaryNotesGroup, attends && dietaryNeeds === "si");
  setCollapsibleState(plusOneGroup, attends);
  setCollapsibleState(childrenGroup, attends);
  setCollapsibleState(shuttleGroup, attends);

  if (!attends) {
    resetRadioGroup("dietaryNeeds");
    resetRadioGroup("plusOne");
    resetRadioGroup("children");
    resetCheckboxGroup("shuttleRoutes");
    dietaryNotesInput.value = "";
    plusOneCountInput.value = "";
    childrenCountInput.value = "";
    renderCompanionDetails(0);
    renderChildDetails(0);
    setCollapsibleState(plusOneCountGroup, false);
    setCollapsibleState(plusOneDetailsGroup, false);
    setCollapsibleState(childrenCountGroup, false);
    setCollapsibleState(childrenDetailsGroup, false);
    return;
  }

  if (dietaryNeeds !== "si") {
    dietaryNotesInput.value = "";
  }

  const hasPlusOne = plusOne === "si";
  setCollapsibleState(plusOneCountGroup, hasPlusOne);
  if (!hasPlusOne) {
    plusOneCountInput.value = "";
    renderCompanionDetails(0);
    setCollapsibleState(plusOneDetailsGroup, false);
  } else {
    renderCompanionDetails(hasValidPlusOneCount ? plusOneCount : 0);
    setCollapsibleState(plusOneDetailsGroup, hasValidPlusOneCount);
  }

  const hasChildren = children === "si";
  setCollapsibleState(childrenCountGroup, hasChildren);
  if (!hasChildren) {
    childrenCountInput.value = "";
    renderChildDetails(0);
    setCollapsibleState(childrenDetailsGroup, false);
    return;
  }

  if (!hasValidChildrenCount) {
    renderChildDetails(0);
    setCollapsibleState(childrenDetailsGroup, false);
    return;
  }

  renderChildDetails(childrenCount);
  setCollapsibleState(childrenDetailsGroup, true);
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
  const dietaryNeeds = formData.get("dietaryNeeds")?.toString() ?? "";
  const dietaryNotes = dietaryNeeds === "si"
    ? formData.get("dietaryNotes")?.toString().trim() ?? ""
    : "";
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
    showError("Confírmanos si asistirás a la boda.");
    return;
  }

  const attends = attendance === "si";

  if (attends && !dietaryNeeds) {
    showError("Indícanos si tienes alergias o restricciones alimentarias.");
    return;
  }

  if (attends && dietaryNeeds === "si" && !dietaryNotes) {
    showError("Cuéntanos cuáles son tus alergias o restricciones alimentarias.");
    return;
  }

  if (attends && !plusOne) {
    showError("Indícanos si vienes acompañado.");
    return;
  }

  if (
    attends &&
    plusOne === "si" &&
    (!Number.isInteger(plusOneCount) || plusOneCount < 1 || plusOneCount > 10)
  ) {
    showError("Indícanos cuántos acompañantes asistirán contigo.");
    return;
  }

  const plusOneDetails = attends && plusOne === "si"
    ? getCompanionDetailsFromDom().slice(0, plusOneCount)
    : [];

  if (attends && plusOne === "si" && plusOneDetails.length !== plusOneCount) {
    showError("Completa la información de todos los acompañantes.");
    return;
  }

  if (attends && plusOne === "si" && plusOneDetails.some((detail) => !detail.name)) {
    showError("Indícanos el nombre de cada acompañante.");
    return;
  }

  if (attends && plusOne === "si" && plusOneDetails.some((detail) => !detail.dietaryNeeds)) {
    showError("Indícanos si cada acompañante tiene alergias o restricciones alimentarias.");
    return;
  }

  if (
    attends &&
    plusOne === "si" &&
    plusOneDetails.some((detail) => detail.dietaryNeeds === "si" && !detail.dietaryNotes)
  ) {
    showError("Completa las alergias o restricciones de los acompañantes que las necesiten.");
    return;
  }

  if (attends && !children) {
    showError("Indícanos si asistirán niños menores de 12 años.");
    return;
  }

  if (attends && children === "si" && (!Number.isInteger(childrenCount) || childrenCount < 1)) {
    showError("Indícanos cuántos niños menores de 12 años asistirán.");
    return;
  }

  const childrenDetails = attends && children === "si"
    ? getChildDetailsFromDom().slice(0, childrenCount)
    : [];

  if (attends && children === "si" && childrenDetails.length !== childrenCount) {
    showError("Completa la información de todos los niños.");
    return;
  }

  if (attends && children === "si" && childrenDetails.some((detail) => !detail.name)) {
    showError("Indícanos el nombre de cada niño.");
    return;
  }

  if (attends && children === "si" && childrenDetails.some((detail) => !detail.dietaryNeeds)) {
    showError("Indícanos si cada niño tiene alergias o restricciones alimentarias.");
    return;
  }

  if (
    attends &&
    children === "si" &&
    childrenDetails.some((detail) => detail.dietaryNeeds === "si" && !detail.dietaryNotes)
  ) {
    showError("Completa las alergias o restricciones de los niños que las necesiten.");
    return;
  }

  const normalizedPlusOneDetails = plusOneDetails.map((detail) => ({
    name: detail.name,
    dietaryNotes: detail.dietaryNeeds === "si" ? detail.dietaryNotes : "",
  }));

  const normalizedChildrenDetails = childrenDetails.map((detail) => ({
    name: detail.name,
    dietaryNotes: detail.dietaryNeeds === "si" ? detail.dietaryNotes : "",
    needsHighChair: detail.needsHighChair,
    needsStroller: detail.needsStroller,
  }));

  const childrenHighChairCount = normalizedChildrenDetails.filter((detail) => detail.needsHighChair).length;
  const childrenStrollerCount = normalizedChildrenDetails.filter((detail) => detail.needsStroller).length;
  const lodgingNeeded =
    lodgingForm?.querySelector('input[name="lodgingNeeded"]:checked')?.value === "si";

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
    plusOneDetails: normalizedPlusOneDetails,
    bringingChildrenUnder12: attends ? children === "si" : false,
    childrenCount: attends && children === "si" ? childrenCount : 0,
    childrenDetails: normalizedChildrenDetails,
    childrenNeedHighChair: childrenHighChairCount > 0,
    childrenHighChairCount,
    childrenNeedStroller: childrenStrollerCount > 0,
    childrenStrollerCount,
    lodgingNeeded,
    shuttleRoutes: attends ? shuttleRoutes : [],
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "rsvps"), rsvpData);
    rsvpForm.classList.add("hidden");
    rsvpSuccess.classList.remove("hidden");
  } catch (error) {
    console.error("Error al guardar la confirmación:", error);
    showError("No hemos podido guardar tu confirmación. Inténtalo otra vez.");
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

let musicEnabled = false;
let weddingSongPrimed = false;

async function primeWeddingSong() {
  if (weddingSongPrimed) return;

  try {
    weddingSong.loop = true;
    weddingSong.volume = 0;
    weddingSong.currentTime = 0;
    await weddingSong.play();
    weddingSong.pause();
    weddingSong.currentTime = 0;
    weddingSong.volume = 0.6;
    weddingSongPrimed = true;
  } catch (error) {
    weddingSong.volume = 0.6;
    console.error("No se ha podido preparar la música:", error);
  }
}

function stopMusic() {
  weddingSong.pause();
  musicEnabled = false;
  musicToggle.querySelector(".floating-ui__label").textContent = "Música";
  musicToggle.setAttribute("aria-label", "Activar música");
}

async function startMusic() {
  if (musicEnabled) return;
  weddingSong.loop = true;
  weddingSong.volume = 0.6;
  await weddingSong.play();
  musicEnabled = true;
  musicToggle.querySelector(".floating-ui__label").textContent = "Silenciar";
  musicToggle.setAttribute("aria-label", "Silenciar música");
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
  configureHeroIntroSource();
  heroIntroVideo?.addEventListener("loadeddata", prepareHeroIntroPreview, { once: true });
  heroIntroVideo?.addEventListener("error", () => {
    const defaultSource = heroIntroVideo?.dataset.defaultSrc;
    const currentSource = heroIntroVideo?.currentSrc ?? heroIntroVideo?.getAttribute("src") ?? "";

    if (defaultSource && !currentSource.includes("video%20sobre%20verde%20android.mp4")) {
      console.warn("La versión iPhone del vídeo no se ha podido cargar. Se usa la copia Android.");
      useDefaultHeroIntroSource();
      return;
    }

    openInvitationAfterVideo();
  });
  heroIntroTrigger?.addEventListener("click", playHeroIntro);
  heroIntroVideo?.addEventListener("timeupdate", () => {
    if (
      heroIntroVideo.currentTime >= 3.1 ||
      (heroIntroVideo.duration && (heroIntroVideo.duration - heroIntroVideo.currentTime) <= 0.25)
    ) {
      openInvitationAfterVideo();
    }
  });
  heroIntroVideo?.addEventListener("ended", openInvitationAfterVideo);
  heroTransitionVideo?.addEventListener("error", revealInvitationAfterTransition);
  scrollHint?.addEventListener("click", playHeroIntro);
  navUp?.addEventListener("click", () => scrollByViewport(-1));
  navDown?.addEventListener("click", () => scrollByViewport(1));
  musicToggle?.addEventListener("click", handleMusicToggle);
  calendarBtn?.addEventListener("click", createCalendarFile);
  lodgingForm
    ?.querySelectorAll('input[name="lodgingNeeded"]')
    .forEach((input) => input.addEventListener("change", syncLodgingState));
  plusOneCountInput?.addEventListener("change", syncRsvpState);
  childrenCountInput?.addEventListener("change", syncRsvpState);
  plusOneDetailsFields?.addEventListener("change", (event) => {
    const detailCard = event.target.closest("[data-companion-item]");
    if (detailCard && event.target.matches('[data-field="dietaryNeeds"]')) {
      syncDynamicDietaryState(detailCard);
    }
  });
  childrenDetailsFields?.addEventListener("change", (event) => {
    const detailCard = event.target.closest("[data-child-item]");
    if (detailCard && event.target.matches('[data-field="dietaryNeeds"]')) {
      syncDynamicDietaryState(detailCard);
    }
  });

  rsvpForm?.addEventListener("submit", handleRsvpSubmit);
  [
    "attendance",
    "dietaryNeeds",
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
setupPhotoIntroState();
setupInteractions();
syncLodgingState();
syncRsvpState();
updateCountdown();
window.setInterval(updateCountdown, 1000);
