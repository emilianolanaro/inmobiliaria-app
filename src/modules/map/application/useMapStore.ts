import { create } from "zustand";

export type MapOverlayLayer =
  | "exchacras"
  | "neighborhoods"
  | "blocks"
  | "parcels"
  | "properties";

export type MapDrawingMode =
  | "exchacra"
  | null;

interface MapState {
  baseMapVisible: boolean;

  layers: Record<MapOverlayLayer, boolean>;

  drawingMode: MapDrawingMode;

  setBaseMapVisible: (visible: boolean) => void;

  setLayerVisible: (
    layer: MapOverlayLayer,
    visible: boolean,
  ) => void;

  startDrawingExChacra: () => void;

  stopDrawing: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  baseMapVisible: true,

  layers: {
    exchacras: true,
    neighborhoods: true,
    blocks: true,
    parcels: true,
    properties: true,
  },

  drawingMode: null,

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

  startDrawingExChacra: () =>
    set({
      drawingMode: "exchacra",
    }),

  stopDrawing: () =>
    set({
      drawingMode: null,
    }),
}));