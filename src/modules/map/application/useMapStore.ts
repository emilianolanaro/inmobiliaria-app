import { create } from "zustand";

export type MapOverlayLayer =
  | "neighborhoods"
  | "blocks"
  | "parcels"
  | "properties";

interface MapState {
  baseMapVisible: boolean;

  layers: Record<MapOverlayLayer, boolean>;

  setBaseMapVisible: (visible: boolean) => void;

  setLayerVisible: (
    layer: MapOverlayLayer,
    visible: boolean,
  ) => void;
}

export const useMapStore = create<MapState>((set) => ({
  baseMapVisible: true,

  layers: {
    neighborhoods: true,
    blocks: true,
    parcels: true,
    properties: true,
  },

  setBaseMapVisible: (visible) =>
    set({
      baseMapVisible: visible,
    }),

  setLayerVisible: (layer, visible) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layer]: visible,
      },
    })),
}));