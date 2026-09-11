// The CC0 Poly Haven props the maps use. Side-effect free so tests can import
// it — tools/fetch-models.mjs (which downloads on import) must never be imported.
// Trees and modular fences use prepare-natural-assets.mjs for bounded detail
// and distance levels before shipping; raw downloads are never deployed.
export const MODELS = [
  "Barrel_01", "barrel_03", "Barrel_02", "cardboard_box_01", "plastic_crate_02", "wooden_crate_02",
  "wooden_military_crate", "old_tyre", "concrete_road_barrier_02", "portable_generator", "propane_tank",
  "hand_truck", "industrial_pastic_container", "metal_jerrycan", "tree_stump_01", "rock_moss_set_01",
  "rock_07", "shrub_02", "fern_02", "street_lamp_01", "fire_hydrant", "trashbag",
  "water_manhole_cover", "gate_latch_01", "metal_trash_can", "ladder_sectioned_01", "industrial_caged_sconce",
  "pine_sapling_small", "pine_sapling_medium", "island_tree_01", "island_tree_02", "modular_chainlink_fence",
];
