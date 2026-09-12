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
  /*
   * Mapa base.
   */
  baseMapVisible: boolean;

  /*
   * Capas geográficas.
   */
  layers: Record<
    MapOverlayLayer,
    boolean
  >;

  /*
   * Las etiquetas son independientes
   * del polígono de EXCHACRAS.
   *
   * Esto permite:
   *
   * ☑ EXCHACRAS
   * ☐ Nombres / números
   */
  exChacraLabelsVisible: boolean;

  /*
   * Herramienta de dibujo activa.
   */
  drawingMode: MapDrawingMode;

  setBaseMapVisible: (
    visible: boolean,
  ) => void;

  setLayerVisible: (
    layer: MapOverlayLayer,
    visible: boolean,
  ) => void;

  setExChacraLabelsVisible: (
    visible: boolean,
  ) => void;

  startDrawingExChacra: () => void;

  stopDrawing: () => void;
}

export const useMapStore =
  create<MapState>((set) => ({
    baseMapVisible: true,

    layers: {
      exchacras: true,
      neighborhoods: true,
      blocks: true,
      parcels: true,
      properties: true,
    },

    /*
     * Por defecto mostramos los números.
     */
    exChacraLabelsVisible: true,

    drawingMode: null,

    setBaseMapVisible: (
      visible,
    ) =>
      set({
        baseMapVisible: visible,
      }),

    setLayerVisible: (
      layer,
      visible,
    ) =>
      set((state) => ({
        layers: {
          ...state.layers,
          [layer]: visible,
        },
      })),

    setExChacraLabelsVisible: (
      visible,
    ) =>
      set({
        exChacraLabelsVisible:
          visible,
      }),

    startDrawingExChacra: () =>
      set({
        drawingMode:
          "exchacra",
      }),

    stopDrawing: () =>
      set({
        drawingMode: null,
      }),
  }));