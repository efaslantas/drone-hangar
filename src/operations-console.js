export const VEHICLE_MODES = Object.freeze({
  MANUAL: "MANUAL",
  HOLD: "HOLD",
  ROUTE: "ROUTE",
  STOPPED: "STOPPED",
});

const VALID_MODES = new Set(Object.values(VEHICLE_MODES));

function validFleet(fleet) {
  if (!Array.isArray(fleet) || fleet.length === 0) return false;
  const ids = fleet.map((vehicle) => vehicle?.id);
  return ids.every((id) => typeof id === "string" && id.length > 0)
    && new Set(ids).size === ids.length;
}

function updateVehicles(session, update) {
  return { ...session, vehicles: session.vehicles.map(update) };
}

export function createConsoleSession(fleet, selectedId = fleet?.[0]?.id) {
  if (!validFleet(fleet) || !fleet.some((vehicle) => vehicle.id === selectedId)) {
    throw new TypeError("A unique fleet and valid selected vehicle are required");
  }

  return {
    selectedId,
    emergency: false,
    vehicles: fleet.map((vehicle) => ({
      ...vehicle,
      mode: vehicle.id === selectedId ? VEHICLE_MODES.MANUAL : VEHICLE_MODES.HOLD,
    })),
  };
}

export function selectVehicle(session, vehicleId) {
  if (!session.vehicles.some((vehicle) => vehicle.id === vehicleId)) return session;
  const selected = updateVehicles(session, (vehicle) => ({
    ...vehicle,
    mode: session.emergency
      ? VEHICLE_MODES.STOPPED
      : vehicle.id === vehicleId
        ? VEHICLE_MODES.MANUAL
        : vehicle.mode === VEHICLE_MODES.MANUAL
          ? VEHICLE_MODES.HOLD
          : vehicle.mode,
  }));
  return { ...selected, selectedId: vehicleId };
}

export function cycleVehicle(session, direction = 1) {
  const current = session.vehicles.findIndex((vehicle) => vehicle.id === session.selectedId);
  if (current < 0 || session.vehicles.length === 0) return session;
  const step = direction < 0 ? -1 : 1;
  const next = (current + step + session.vehicles.length) % session.vehicles.length;
  return selectVehicle(session, session.vehicles[next].id);
}

export function setVehicleMode(session, vehicleId, mode) {
  if (session.emergency || !VALID_MODES.has(mode)) return session;
  if (!session.vehicles.some((vehicle) => vehicle.id === vehicleId)) return session;
  if (mode === VEHICLE_MODES.MANUAL) return selectVehicle(session, vehicleId);
  return updateVehicles(session, (vehicle) => (
    vehicle.id === vehicleId ? { ...vehicle, mode } : vehicle
  ));
}

export function emergencyStop(session) {
  if (session.emergency) return session;
  const stopped = updateVehicles(session, (vehicle) => ({
    ...vehicle,
    mode: VEHICLE_MODES.STOPPED,
  }));
  return { ...stopped, emergency: true };
}

export function reenableConsole(session) {
  if (!session.emergency) return session;
  const enabled = updateVehicles(session, (vehicle) => ({
    ...vehicle,
    mode: vehicle.id === session.selectedId ? VEHICLE_MODES.MANUAL : VEHICLE_MODES.HOLD,
  }));
  return { ...enabled, emergency: false };
}

export function handleControlLoss(session) {
  if (session.emergency) return session;
  return updateVehicles(session, (vehicle) => (
    vehicle.id === session.selectedId && vehicle.mode === VEHICLE_MODES.MANUAL
      ? { ...vehicle, mode: VEHICLE_MODES.HOLD }
      : vehicle
  ));
}

export function vehicleMode(session, vehicleId) {
  return session.vehicles.find((vehicle) => vehicle.id === vehicleId)?.mode;
}
