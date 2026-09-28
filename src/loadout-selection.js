// Operations may assign a map or airframe, but only an explicit lock overrides
// the pilot's last manual choice.
export function resolveOperationLoadout(preferred, op) {
  return {
    drone: op.lockDrone && op.drone ? op.drone : preferred.drone,
    map: op.lockMap && op.map ? op.map : preferred.map,
  };
}
