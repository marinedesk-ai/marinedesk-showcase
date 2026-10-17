const divisions = {
  procurement: {
    name: "Procurement", index: "Division 01 / 06", status: "Product status not independently verified",
    intro: "Maritime sourcing workflows, including RFQs and supplier quotations.",
    purpose: "Support a more structured procurement journey for maritime requirements and supplier responses.",
    workflows: "Sourcing request → RFQ → supplier quotation → response review. Supplier Cloud is a connected supplier-facing Procurement experience.",
    users: "Maritime procurement and sourcing teams, with suppliers participating through the connected Supplier Cloud experience.",
    ai: "Potential directions include request classification, quotation comparison support, and sourcing insights. These are exploratory possibilities, not verified live capabilities.", supplier: true
  },
  operations: {
    name: "Operations & Chartering", index: "Division 02 / 06", status: "Product status not independently verified",
    intro: "A division for maritime operations and chartering workflows.",
    purpose: "Bring vessel operations and chartering coordination into a connected operational context.",
    workflows: "Potential workflow areas include voyage and port-call coordination, chartering activity, and operational handoffs. These topics require owner confirmation.",
    users: "Maritime operations and chartering teams; specific roles and workflows are to be confirmed.",
    ai: "Potential directions include summarizing operational context, highlighting schedule changes, and assisting with information retrieval. Not verified as live capabilities."
  },
  crewing: {
    name: "Crewing", index: "Division 03 / 06", status: "Product status not independently verified",
    intro: "A division for maritime crew-related coordination.",
    purpose: "Support the coordination of people and crew processes across maritime operations.",
    workflows: "Potential workflow areas include crew planning, readiness information, and deployment coordination. Exact scope is to be confirmed.",
    users: "Crewing and workforce coordination teams; specific user groups require owner confirmation.",
    ai: "Potential directions include document information extraction, readiness summaries, and planning assistance. Human review and any policy constraints would need to be explicit; none is verified live."
  },
  technical: {
    name: "Technical Management", index: "Division 04 / 06", status: "Product status not independently verified",
    intro: "A division for technical vessel management and maintenance workflows.",
    purpose: "Organize technical work and maintenance planning in a maritime enterprise context.",
    workflows: "Potential workflow areas include maintenance requests, work planning, and technical records. Product-specific details require owner confirmation.",
    users: "Technical and maintenance management teams; exact roles are to be confirmed.",
    ai: "Potential directions include classifying maintenance requests, summarizing work history, and surfacing planning context. These are exploratory and not verified as live."
  },
  drydock: {
    name: "Dry Dock Management", index: "Division 05 / 06", status: "Product status not independently verified",
    intro: "A division associated with planned vessel dry dock periods.",
    purpose: "Provide a dedicated place in the enterprise vision for dry dock planning and coordination.",
    workflows: "Potential workflow areas include preparing a docking period, coordinating work scopes, and tracking planning updates. Exact product behavior is unverified.",
    users: "Technical, maintenance, and dry dock coordination teams; specific roles require owner confirmation.",
    ai: "Potential directions include scope organization, document summarization, and schedule-change visibility. Not verified as live product features."
  },
  marinesep: {
    name: "Marine Superintendent", index: "Division 06 / 06", status: "Functional scope and product status to be confirmed",
    intro: "Marine Superintendent is the confirmed full name of the sixth division. Its functional scope has not been confirmed.",
    purpose: "To be defined by the product owner. No product capability is asserted.",
    workflows: "To be confirmed by the product owner.",
    users: "To be confirmed by the product owner.",
    ai: "No AI capabilities are described pending confirmation of the division’s scope."
  }
};

const dialog = document.querySelector("#divisionDialog");
const soundToggle = document.querySelector("#soundToggle");
const soundState = document.querySelector("#soundState");
const supplierReveal = document.querySelector("#supplierReveal");
const toast = document.querySelector("#toast");
const pointerGlow = document.querySelector("#pointerGlow");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");
const closeAnimationMs = 230;
const hoverCooldownMs = 160;
let soundOn = false;
let audioContext = null;
const activeOscillators = new Set();
let opener = null;
let toastTimer = null;
let closeTimer = null;
let closing = false;
let lastHoverAt = -Infinity;
let pointerFrame = 0;
let pendingPointer = null;
let pointerEffectActive = false;

try { soundOn = localStorage.getItem("marinedesk-showcase-sound") === "on"; } catch { soundOn = false; }
updateSoundButton();
updatePointerEffects();

function updateSoundButton() {
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  soundToggle.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
  soundState.textContent = soundOn ? "On" : "Off";
}

function stopActiveTones() {
  for (const oscillator of activeOscillators) {
    try { oscillator.stop(); } catch { /* A tone may already have ended. */ }
  }
  activeOscillators.clear();
}

function playTone(kind) {
  if (!soundOn || (kind === "hover" && reducedMotion.matches)) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === "suspended") audioContext.resume();
    stopActiveTones();
    const now = audioContext.currentTime;
    const tones = kind === "open" ? [[660, 0], [880, .075]] : [[1040, 0]];
    for (const [frequency, offset] of tones) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(kind === "hover" ? .008 : .018, now + offset + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .085);
      osc.connect(gain); gain.connect(audioContext.destination);
      activeOscillators.add(osc);
      osc.onended = () => activeOscillators.delete(osc);
      osc.start(now + offset); osc.stop(now + offset + .095);
    }
  } catch { /* Audio is optional; the interface remains usable without it. */ }
}

function playHoverTone() {
  const now = performance.now();
  if (now - lastHoverAt < hoverCooldownMs) return;
  lastHoverAt = now;
  playTone("hover");
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1900);
}

function openDivision(key, trigger, showSupplier = false) {
  const item = divisions[key];
  if (!item || dialog.open) return;
  opener = trigger;
  closing = false;
  dialog.classList.remove("is-closing");
  document.querySelector("#panelEyebrow").textContent = item.index;
  document.querySelector("#dialogTitle").textContent = item.name;
  document.querySelector("#panelIntro").textContent = item.intro;
  document.querySelector("#panelStatus").textContent = item.status;
  document.querySelector("#panelPurpose").textContent = item.purpose;
  document.querySelector("#panelWorkflows").textContent = item.workflows;
  document.querySelector("#panelUsers").textContent = item.users;
  document.querySelector("#panelAI").textContent = item.ai;
  supplierReveal.hidden = !(item.supplier && showSupplier);
  dialog.showModal();
  document.querySelector("#closePanel").focus();
}

function finishClose() {
  if (!dialog.open || !closing) return;
  clearTimeout(closeTimer);
  closeTimer = null;
  closing = false;
  dialog.classList.remove("is-closing");
  dialog.close();
}

function closePanel() {
  if (!dialog.open || closing) return;
  if (reducedMotion.matches) {
    closing = true;
    finishClose();
    return;
  }
  closing = true;
  dialog.classList.add("is-closing");
  closeTimer = setTimeout(finishClose, closeAnimationMs);
}

document.querySelectorAll("[data-division]").forEach((button) => {
  button.addEventListener("click", () => {
    if (dialog.open) return;
    playTone("open");
    openDivision(button.dataset.division, button, button.dataset.division === "procurement");
  });
  button.addEventListener("pointerenter", (event) => {
    if (finePointer.matches && event.pointerType !== "touch") playHoverTone();
  });
  button.addEventListener("focus", () => {
    if (button.matches(":focus-visible")) playHoverTone();
  });
});

document.querySelector("#supplierDetails").addEventListener("click", (event) => {
  if (dialog.open) return;
  openDivision("procurement", event.currentTarget, true);
  showToast("Supplier Cloud is connected to Procurement");
});

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  updateSoundButton();
  try { localStorage.setItem("marinedesk-showcase-sound", soundOn ? "on" : "off"); } catch { /* Preference remains for this page session. */ }
  if (soundOn) {
    playTone("click");
    showToast("Sound enabled · use this control to turn it off");
  } else stopActiveTones();
});

document.querySelector("#closePanel").addEventListener("click", closePanel);
dialog.addEventListener("click", (event) => { if (event.target === dialog) closePanel(); });
dialog.addEventListener("cancel", (event) => { event.preventDefault(); closePanel(); });
dialog.addEventListener("animationend", (event) => {
  if (event.target === dialog && event.animationName === "panel-out") finishClose();
});
dialog.addEventListener("close", () => {
  dialog.classList.remove("is-closing");
  if (opener && typeof opener.focus === "function") opener.focus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog.open) {
    event.preventDefault();
    closePanel();
  }
});

document.querySelector("#supplierPanelLink").addEventListener("click", (event) => {
  event.preventDefault();
  const target = document.querySelector("#procurement");
  closePanel();
  setTimeout(() => target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" }), closeAnimationMs);
});

function updatePointerEffects() {
  pointerEffectActive = finePointer.matches && !reducedMotion.matches;
  pointerGlow.classList.toggle("is-active", pointerEffectActive);
  if (!pointerEffectActive) {
    pointerGlow.classList.remove("is-visible");
    for (const element of document.querySelectorAll(".division-card, #ecosystemMap")) {
      element.classList.remove("pointer-highlight");
      element.style.removeProperty("--pointer-x");
      element.style.removeProperty("--pointer-y");
    }
  }
}

function queuePointerEffect(event) {
  if (!pointerEffectActive || event.pointerType === "touch") return;
  pendingPointer = { target: event.currentTarget, clientX: event.clientX, clientY: event.clientY };
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    pointerFrame = 0;
    if (!pointerEffectActive || !pendingPointer) return;
    const { target, clientX, clientY } = pendingPointer;
    const rect = target.getBoundingClientRect();
    const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const localY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    target.style.setProperty("--pointer-x", `${(localX / rect.width) * 100}%`);
    target.style.setProperty("--pointer-y", `${(localY / rect.height) * 100}%`);
    if (target.id === "ecosystemMap") target.classList.add("pointer-highlight");
    pointerGlow.style.setProperty("--pointer-x", `${clientX}px`);
    pointerGlow.style.setProperty("--pointer-y", `${clientY}px`);
    pointerGlow.classList.add("is-visible");
    pendingPointer = null;
  });
}

function hidePointerEffect(event) {
  pendingPointer = null;
  pointerGlow.classList.remove("is-visible");
  event.currentTarget.classList.remove("pointer-highlight");
}

for (const element of document.querySelectorAll(".division-card, #ecosystemMap")) {
  element.addEventListener("pointermove", queuePointerEffect, { passive: true });
  element.addEventListener("pointerleave", hidePointerEffect, { passive: true });
}
document.querySelectorAll(".button, .close-button").forEach((button) => {
  button.addEventListener("click", () => playTone("click"));
});
reducedMotion.addEventListener?.("change", updatePointerEffects);
finePointer.addEventListener?.("change", updatePointerEffects);
