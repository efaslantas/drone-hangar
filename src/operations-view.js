const MODE_LABELS = {
  MANUAL: "MANUEL",
  HOLD: "BEKLEME",
  ROUTE: "ROTA",
  STOPPED: "DURDU",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function operationsViewModel(state) {
  const session = state?.session || { vehicles: [] };
  return {
    vehicles: session.vehicles.map((vehicle) => {
      const telemetry = state.telemetry?.[vehicle.id] || {};
      return {
        id: vehicle.id,
        kind: vehicle.kind,
        label: `${vehicle.kind === "air" ? "İHA" : "İDA"}-${vehicle.id.split("-").at(-1)}`,
        mode: MODE_LABELS[vehicle.mode] || vehicle.mode,
        battery: `${Math.round((Number(telemetry.battery) || 0) * 100)}%`,
        speed: `${(Number(telemetry.speed) || 0).toFixed(1)} m/s`,
        selected: session.selectedId === vehicle.id,
      };
    }),
    selectedId: session.selectedId,
    controllerWarning: state.controller?.connected ? "" : "PS kol bağlı değil — araç güvenli beklemede",
    controllerName: state.controller?.name || "",
    routeError: state.routeError || "",
    routes: state.routes || {},
    scenarios: Array.isArray(state.scenarios) ? state.scenarios : [],
    emergency: Boolean(session.emergency),
    emergencyLabel: session.emergency ? "Acil durdurma etkin — yeniden etkinleştirme gerekli" : "",
    mapRevision: Number(state.mapRevision) || 0,
  };
}

function fleetMarkup(vehicles) {
  return vehicles.map((vehicle) => `
    <button type="button" class="operations-vehicle${vehicle.selected ? " selected" : ""}" data-vehicle="${escapeHtml(vehicle.id)}">
      <span><b>${escapeHtml(vehicle.label)}</b><em>${vehicle.kind === "air" ? "İHA" : "İDA"}</em></span>
      <strong>${escapeHtml(vehicle.mode)}</strong>
      <small>${escapeHtml(vehicle.battery)} · ${escapeHtml(vehicle.speed)}</small>
    </button>`).join("");
}

function scenarioMarkup(scenarios) {
  if (!scenarios.length) return '<p class="operations-empty">Kayıtlı senaryo yok.</p>';
  return scenarios.map((scenario) => `
    <article class="operations-scenario">
      <b>${escapeHtml(scenario.name)}</b>
      <span>
        <button type="button" data-scenario-action="load" data-scenario-id="${escapeHtml(scenario.id)}">Yükle</button>
        <button type="button" data-scenario-action="delete" data-scenario-id="${escapeHtml(scenario.id)}">Sil</button>
      </span>
    </article>`).join("");
}

function installActions(root, actions) {
  root.__operationsActions = actions;
  if (root.__operationsClick) return;
  root.__operationsClick = (event) => {
    const vehicle = event.target.closest?.("[data-vehicle]");
    if (vehicle?.dataset.vehicle) {
      root.__operationsActions?.selectVehicle?.(vehicle.dataset.vehicle);
      return;
    }
    const action = event.target.closest?.("[data-operation-action], [data-scenario-action]");
    if (!action) return;
    const name = action.dataset.operationAction || action.dataset.scenarioAction;
    const handlers = {
      "route-apply": "applyRoute",
      "route-clear": "clearRoute",
      "scenario-save": "saveScenario",
      load: "loadScenario",
      delete: "deleteScenario",
      reenable: "reenable",
      exit: "exit",
    };
    root.__operationsActions?.[handlers[name]]?.(action.dataset.scenarioId);
  };
  root.addEventListener("click", root.__operationsClick);
}

export function renderOperationsConsole(root, model, actions = {}) {
  if (!root) return;
  root.hidden = false;
  root.classList.add("active");
  const fleet = root.querySelector("#operations-fleet");
  const controller = root.querySelector("#operations-controller");
  const error = root.querySelector("#operations-route-error");
  const scenarios = root.querySelector("#operations-scenarios");
  const emergency = root.querySelector("#operations-emergency");
  const map = root.querySelector("#operations-map-overlay");
  const fleetSignature = JSON.stringify(model.vehicles);
  if (fleet && root.__operationsFleetSignature !== fleetSignature) {
    fleet.innerHTML = fleetMarkup(model.vehicles);
    root.__operationsFleetSignature = fleetSignature;
  }
  if (controller) {
    controller.textContent = model.controllerWarning || model.controllerName;
    controller.hidden = !controller.textContent;
  }
  if (error) {
    error.textContent = model.routeError;
    error.hidden = !model.routeError;
  }
  const scenarioSignature = JSON.stringify(model.scenarios);
  if (scenarios && root.__operationsScenarioSignature !== scenarioSignature) {
    scenarios.innerHTML = scenarioMarkup(model.scenarios);
    root.__operationsScenarioSignature = scenarioSignature;
  }
  if (emergency) {
    emergency.hidden = !model.emergency;
    emergency.textContent = model.emergencyLabel;
  }
  if (map && map.dataset.revision !== String(model.mapRevision)) {
    map.dataset.revision = String(model.mapRevision);
    map.textContent = `${model.selectedId || "—"} · ${(model.routes[model.selectedId]?.points || []).length} nokta`;
  }
  installActions(root, actions);
}

export function clearOperationsConsole(root) {
  if (!root) return;
  root.hidden = true;
  root.classList.remove("active");
  if (root.__operationsClick) root.removeEventListener("click", root.__operationsClick);
  delete root.__operationsClick;
  delete root.__operationsActions;
  delete root.__operationsFleetSignature;
  delete root.__operationsScenarioSignature;
  const fleet = root.querySelector("#operations-fleet");
  const scenarios = root.querySelector("#operations-scenarios");
  if (fleet) fleet.innerHTML = "";
  if (scenarios) scenarios.innerHTML = "";
}
