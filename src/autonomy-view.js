const PHASE_LABELS = {
  READY: "Hazır",
  AIR_SEARCH: "İHA keşifte",
  DETECTED: "Olay tespit edildi",
  SEA_DISPATCH: "İDA sevk edildi",
  JOINT_VERIFY: "Ortak doğrulama",
  COMPLETE: "Görev tamamlandı",
  FAILED: "Görev başarısız",
  ABORTED: "Görev iptal edildi",
};

const TERMINAL = new Set(["COMPLETE", "FAILED", "ABORTED"]);

function clock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function autonomyViewModel(run, vehicles = []) {
  const terminal = TERMINAL.has(run?.phase);
  const controlled = run?.controlledByVehicle || null;
  return {
    phase: run?.phase || "READY",
    phaseLabel: PHASE_LABELS[run?.phase] || run?.phase || "Hazır",
    elapsed: clock(run?.elapsed),
    paused: !!run?.paused,
    reason: run?.reason || "",
    vehicles: vehicles.map((vehicle) => ({
      id: String(vehicle.id),
      role: vehicle.role || "ARAÇ",
      speed: `${Math.max(0, Number(vehicle.speed) || 0).toFixed(1)} m/s`,
      battery: `${Math.round(Math.max(0, Number(vehicle.battery) || 0))}%`,
      mode: controlled === vehicle.id ? "MANUEL" : "OTONOM",
    })),
    actions: {
      pause: !terminal && !run?.paused,
      resume: !terminal && !!run?.paused,
      takeAir: !terminal && !controlled,
      takeSea: !terminal && !controlled,
      returnToAutonomy: !terminal && !!controlled,
      abort: !terminal,
    },
  };
}

export function renderAutonomyPanel(root, model) {
  if (!root || !model) return;
  root.hidden = false;
  root.classList?.add("active");
  const setText = (selector, value) => {
    const node = root.querySelector?.(selector);
    if (node) node.textContent = value;
  };
  setText("#autonomy-status", model.phaseLabel);
  setText("#autonomy-time", model.elapsed);
  setText("#autonomy-reason", model.reason);
  const vehicles = root.querySelector?.("#autonomy-vehicles");
  if (vehicles) {
    const existing = vehicles.querySelectorAll ? [...vehicles.querySelectorAll("[data-vehicle]")] : [];
    const sameVehicles = existing.length === model.vehicles.length && existing.every((node, i) => node.dataset.vehicle === model.vehicles[i].id);
    if (!sameVehicles) {
      vehicles.innerHTML = model.vehicles.map((v) =>
        `<button type="button" class="autonomy-vehicle ${v.mode === "MANUEL" ? "manual" : ""}" data-vehicle="${escapeHtml(v.id)}">` +
        `<b>${escapeHtml(v.role)} · ${escapeHtml(v.id)}</b><span>${escapeHtml(v.mode)} · ${escapeHtml(v.speed)} · BAT ${escapeHtml(v.battery)}</span></button>`
      ).join("");
    } else {
      existing.forEach((node, i) => {
        const vehicle = model.vehicles[i];
        node.classList.toggle("manual", vehicle.mode === "MANUEL");
        node.querySelector("b").textContent = `${vehicle.role} · ${vehicle.id}`;
        node.querySelector("span").textContent = `${vehicle.mode} · ${vehicle.speed} · BAT ${vehicle.battery}`;
      });
    }
  }
  const actionMap = {
    pause: "pause",
    resume: "resume",
    "take-air": "takeAir",
    "take-sea": "takeSea",
    return: "returnToAutonomy",
    abort: "abort",
  };
  for (const [action, key] of Object.entries(actionMap)) {
    const button = root.querySelector?.(`[data-action="${action}"]`);
    if (button) button.hidden = !model.actions[key];
  }
}

export function clearAutonomyPanel(root) {
  if (!root) return;
  root.hidden = true;
  root.classList?.remove("active");
  const vehicles = root.querySelector?.("#autonomy-vehicles");
  if (vehicles) vehicles.innerHTML = "";
  const reason = root.querySelector?.("#autonomy-reason");
  if (reason) reason.textContent = "";
}
