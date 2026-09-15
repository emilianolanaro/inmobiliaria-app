import {
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import Collection from "ol/Collection";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";

import type Geometry from "ol/geom/Geometry";

import Draw from "ol/interaction/Draw";
import Snap from "ol/interaction/Snap";
import Translate from "ol/interaction/Translate";
import Overlay from "ol/Overlay";
import type Map from "ol/Map";

import {
  useMapStore,
} from "../../../map/application/useMapStore";
import FixedLengthConstraintInteraction, {
  type SegmentPreview,
} from "./FixedLengthConstraintInteraction";
import {
  createExChacra,
} from "../../application/createExChacra";

import {
  attachExChacraSnapFeedback,
  createExChacraSnapInteraction,
  type ExChacraVectorSource,
  loadExChacrasIntoSource,
} from "../exChacraMap";

import type {
  ExChacraDrawMode,
  RectangleDrawMode,
} from "./drawingTypes";

import {
  createMetricBoxGeometryFunction,
  createRectangleFromDimensions,
} from "./metricGeometry";

interface Params {
  mapRef:
    RefObject<Map | null>;

  draftSourceRef:
    RefObject<
      ExChacraVectorSource | null
    >;

  exChacrasSourceRef:
    RefObject<
      ExChacraVectorSource | null
    >;
}

/*
 * Convierte cualquier Feature visual
 * de OpenLayers al GeoJSON que
 * persistimos en SQLite.
 */
function featureToGeoJson(
  feature: Feature<Geometry>,
): string {
  const geometry =
    feature.getGeometry();

  if (!geometry) {
    throw new Error(
      "La geometría está vacía.",
    );
  }

  const format =
    new GeoJSON();

  const object =
    format.writeGeometryObject(
      geometry,
      {
        featureProjection:
          "EPSG:3857",

        dataProjection:
          "EPSG:4326",

        decimals: 7,
      },
    );

  return JSON.stringify(
    object,
  );
}

export function useExChacraDrawing({
  mapRef,
  draftSourceRef,
  exChacrasSourceRef,
}: Params) {
  const drawingMode =
    useMapStore(
      (state) =>
        state.drawingMode,
    );

  const stopDrawing =
    useMapStore(
      (state) =>
        state.stopDrawing,
    );

  /*
   * --------------------------------------------------
   * CONFIGURACIÓN
   * --------------------------------------------------
   */

  const [
    drawMode,
    setDrawModeState,
  ] =
    useState<ExChacraDrawMode>(
      "rectangle",
    );

  const [
    rectangleMode,
    setRectangleModeState,
  ] =
    useState<RectangleDrawMode>(
      "diagonal",
    );

  const [
    widthValue,
    setWidthValue,
  ] = useState("100");

  const [
    heightValue,
    setHeightValue,
  ] = useState("100");

  const [
    rotationValue,
    setRotationValue,
  ] = useState("0");

  /*
   * --------------------------------------------------
   * NÚMERO Y GEOMETRÍA PENDIENTE
   * --------------------------------------------------
   */

  const [
    pendingGeometry,
    setPendingGeometry,
  ] =
    useState<string | null>(
      null,
    );

  const [
    numberValue,
    setNumberValue,
  ] = useState("");

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  /*
   * --------------------------------------------------
   * INTERACCIONES
   * --------------------------------------------------
   */

  const drawInteractionRef =
    useRef<Draw | null>(
      null,
    );

  const snapInteractionRef =
    useRef<Snap | null>(
      null,
    );

  const translateInteractionRef =
    useRef<Translate | null>(
      null,
    );

  const snapFeedbackCleanupRef =
    useRef<
      (() => void) | null
    >(null);

  /*
   * Rectángulo construido con medidas
   * exactas y todavía no confirmado.
   */
  const exactRectangleFeatureRef =
    useRef<
      Feature<Geometry> | null
    >(null);

  const [
    exactRectangleReady,
    setExactRectangleReady,
  ] = useState(false);

  /*
 * --------------------------------------------------
 * MODO LIBRE MÉTRICO
 * --------------------------------------------------
 */

/*
 * Cuando está desactivado, el modo Libre
 * se comporta exactamente como antes.
 */
const [
  fixedLengthEnabled,
  setFixedLengthEnabled,
] = useState(false);

/*
 * Valor editable mientras dibujamos.
 */
const [
  fixedLengthValue,
  setFixedLengthValue,
] = useState("100");

/*
 * Cantidad de puntos confirmados.
 */
const [
  freeVertexCount,
  setFreeVertexCount,
] = useState(0);

/*
 * Información dinámica del segmento
 * actualmente bajo el cursor.
 */
const [
  liveSegmentLength,
  setLiveSegmentLength,
] =
  useState<number | null>(
    null,
  );

const [
  liveSegmentAngle,
  setLiveSegmentAngle,
] =
  useState<number | null>(
    null,
  );

/*
 * Guardamos los valores también en refs
 * para que la interacción pueda leerlos
 * sin tener que ser destruida/recreada
 * cada vez que escribimos un número.
 */
const fixedLengthEnabledRef =
  useRef(false);

const fixedLengthValueRef =
  useRef("100");

/*
 * Nuestra interacción CAD.
 */
const fixedLengthInteractionRef =
  useRef<
    FixedLengthConstraintInteraction | null
  >(null);

/*
 * Tooltip flotante de medidas.
 */
const measurementOverlayRef =
  useRef<Overlay | null>(
    null,
  );

const measurementElementRef =
  useRef<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
  fixedLengthEnabledRef.current =
    fixedLengthEnabled;
}, [
  fixedLengthEnabled,
]);

useEffect(() => {
  fixedLengthValueRef.current =
    fixedLengthValue;
}, [
  fixedLengthValue,
]);

  /*
   * --------------------------------------------------
   * LIMPIAR INTERACCIONES
   * --------------------------------------------------
   */
  function removeInteractions() {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    if (
      drawInteractionRef.current
    ) {
      map.removeInteraction(
        drawInteractionRef.current,
      );
    }

    if (
      translateInteractionRef.current
    ) {
      map.removeInteraction(
        translateInteractionRef.current,
      );
    }

    if (
      snapInteractionRef.current
    ) {
      map.removeInteraction(
        snapInteractionRef.current,
      );
    }

    if (
      fixedLengthInteractionRef.current
    ) {
      map.removeInteraction(
        fixedLengthInteractionRef.current,
      );
    }

    if (
      measurementOverlayRef.current
    ) {
      map.removeOverlay(
        measurementOverlayRef.current,
      );
    }

    snapFeedbackCleanupRef.current?.();

    drawInteractionRef.current =
      null;

    translateInteractionRef.current =
      null;

    snapInteractionRef.current =
      null;

    snapFeedbackCleanupRef.current =
      null;

    fixedLengthInteractionRef.current =
      null;

    measurementOverlayRef.current =
      null;

    measurementElementRef.current =
      null;
    
      setLiveSegmentLength(
        null,
      );

      setLiveSegmentAngle(
        null,
      );
  }

  /*
   * --------------------------------------------------
   * DRAW AUTOMÁTICO
   * --------------------------------------------------
   *
   * Se utiliza para:
   *
   * - Rectángulo por diagonal.
   * - Polígono libre.
   *
   * El rectángulo por medidas exactas
   * se genera con un botón aparte.
   */
  useEffect(() => {
    const map =
      mapRef.current;

    const draftSource =
      draftSourceRef.current;

    const exChacrasSource =
      exChacrasSourceRef.current;

    if (
      !map ||
      !draftSource ||
      !exChacrasSource
    ) {
      return;
    }

    removeInteractions();

    if (
      drawingMode !==
      "exchacra"
    ) {
      return;
    }

    /*
     * En modo dimensiones esperamos
     * que el usuario pulse
     * "Crear rectángulo".
     */
    if (
      drawMode ===
        "rectangle" &&
      rectangleMode ===
        "dimensions"
    ) {
      return;
    }

    draftSource.clear();

    let draw: Draw;

    /*
     * RECTÁNGULO POR DIAGONAL
     */
    if (
      drawMode === "rectangle"
    ) {
      draw = new Draw({
          source:
            draftSource,

          /*
           * OpenLayers utiliza Circle
           * como base para geometrías
           * de dos puntos.
           */
          type: "Circle",

          geometryFunction:
            createMetricBoxGeometryFunction(),
        });
    } else {
  /*
   * --------------------------------------------------
   * POLÍGONO LIBRE
   * --------------------------------------------------
   *
   * No permitimos que Draw finalice
   * automáticamente.
   *
   * Lo finalizaremos con:
   *
   * - botón;
   * - tecla Enter.
   *
   * Esto nos da un comportamiento
   * mucho más parecido a CAD.
   */
  draw =
    new Draw({
      source:
        draftSource,

      type: "Polygon",

      stopClick: true,

      /*
       * Evitamos finalizar haciendo
       * doble clic accidentalmente.
       */
      finishCondition:
        () => false,
    });

  /*
   * Tooltip flotante.
   */
  const measurementElement =
    document.createElement(
      "div",
    );

  measurementElement.className =
    "drawing-measure-tooltip";

  measurementElement.style.display =
    "none";

  const measurementOverlay =
    new Overlay({
      element:
        measurementElement,

      offset: [
        12,
        -12,
      ],

      positioning:
        "bottom-left",

      stopEvent: false,
    });

  map.addOverlay(
    measurementOverlay,
  );

  measurementElementRef.current =
    measurementElement;

  measurementOverlayRef.current =
    measurementOverlay;

  /*
   * Restricción métrica.
   */
  const fixedLengthInteraction =
    new FixedLengthConstraintInteraction({
      /*
       * Esta función se ejecuta
       * constantemente.
       */
      getLengthMeters:
        () => {
          if (
            !fixedLengthEnabledRef.current
          ) {
            return null;
          }

          const value =
            Number(
              fixedLengthValueRef.current,
            );

          if (
            !Number.isFinite(value) ||
            value <= 0
          ) {
            return null;
          }

          return value;
        },

      onVertexCountChange:
        (count: number) => {
          setFreeVertexCount(
            count,
          );
        },

      onPreview:
        (
          preview:
            SegmentPreview | null,
        ) => {
          if (!preview) {
            setLiveSegmentLength(
              null,
            );

            setLiveSegmentAngle(
              null,
            );

            measurementElement
              .style
              .display =
              "none";

            return;
          }

          setLiveSegmentLength(
            preview.lengthMeters,
          );

          setLiveSegmentAngle(
            preview.angleDegrees,
          );

          /*
           * Ej:
           *
           * 100.00 m · 34.5°
           */
          measurementElement.textContent =
            `${preview.lengthMeters.toFixed(
              2,
            )} m · ${preview.angleDegrees.toFixed(
              1,
            )}°`;

          measurementElement
            .style
            .display =
            "block";

          measurementOverlay
            .setPosition(
              preview.endCoordinate,
            );
        },
    });

  fixedLengthInteractionRef.current =
    fixedLengthInteraction;

  /*
   * Empieza sin puntos.
   */
  setFreeVertexCount(0);

  fixedLengthInteraction.reset();
}

    const snap =
      createExChacraSnapInteraction(
        exChacrasSource,
      );

    drawInteractionRef.current =
      draw;

    snapInteractionRef.current =
      snap;

    /*
     * Cuando termina la geometría,
     * pasamos al formulario del número.
     */
    draw.on(
      "drawend",
      (event) => {
        const feature =
          event.feature as
            Feature<Geometry>;

        try {
          setPendingGeometry(
            featureToGeoJson(
              feature,
            ),
          );

          setNumberValue("");

          setError(null);

          removeInteractions();

          stopDrawing();
        } catch (
          drawError
        ) {
          console.error(
            "Error terminando dibujo:",
            drawError,
          );

          setError(
            "No se pudo procesar la geometría.",
          );
        }
      },
    );

    /*
     * Snap se agrega después de Draw.
     */
    /*
 * --------------------------------------------------
 * ORDEN DE INTERACCIONES
 * --------------------------------------------------
 *
 * OpenLayers las procesa en orden inverso.
 *
 * Para Libre queremos:
 *
 * Snap
 *      ↓
 * longitud fija
 *      ↓
 * Draw
 */
map.addInteraction(
  draw,
);

if (
  drawMode === "free" &&
  fixedLengthInteractionRef.current
) {
  map.addInteraction(
    fixedLengthInteractionRef.current,
  );
}

map.addInteraction(
  snap,
);

    snapFeedbackCleanupRef.current =
      attachExChacraSnapFeedback(
        map,
        snap,
      );

    return () => {
      removeInteractions();
    };
  }, [
    drawingMode,
    drawMode,
    rectangleMode,
  ]);

  /*
   * --------------------------------------------------
   * CAMBIAR MODO PRINCIPAL
   * --------------------------------------------------
   */
  function changeDrawMode(
    mode:
      ExChacraDrawMode,
  ) {
    removeInteractions();

    draftSourceRef.current
      ?.clear();

    exactRectangleFeatureRef.current =
      null;

    setExactRectangleReady(
      false,
    );

    setError(null);

    setDrawModeState(
      mode,
    );

    setFreeVertexCount(0);

    setLiveSegmentLength(
      null,
    );

    setLiveSegmentAngle(
      null,
    );
  }

  /*
   * --------------------------------------------------
   * CAMBIAR MODO DE RECTÁNGULO
   * --------------------------------------------------
   */
  function changeRectangleMode(
    mode:
      RectangleDrawMode,
  ) {
    removeInteractions();

    draftSourceRef.current
      ?.clear();

    exactRectangleFeatureRef.current =
      null;

    setExactRectangleReady(
      false,
    );

    setError(null);

    setRectangleModeState(
      mode,
    );
  }

  /*
   * --------------------------------------------------
   * CREAR RECTÁNGULO DE MEDIDA EXACTA
   * --------------------------------------------------
   */
  function generateExactRectangle() {
    const map =
      mapRef.current;

    const draftSource =
      draftSourceRef.current;

    const exChacrasSource =
      exChacrasSourceRef.current;

    if (
      !map ||
      !draftSource ||
      !exChacrasSource
    ) {
      return;
    }

    const width =
      Number(widthValue);

    const height =
      Number(heightValue);

    const rotation =
      Number(rotationValue);

    if (
      !Number.isFinite(width) ||
      width <= 0
    ) {
      setError(
        "Ingresá un ancho válido en metros.",
      );

      return;
    }

    if (
      !Number.isFinite(height) ||
      height <= 0
    ) {
      setError(
        "Ingresá un alto válido en metros.",
      );

      return;
    }

    if (
      !Number.isFinite(rotation)
    ) {
      setError(
        "Ingresá un ángulo válido.",
      );

      return;
    }

    const center =
      map
        .getView()
        .getCenter();

    if (!center) {
      return;
    }

    removeInteractions();

    draftSource.clear();

    /*
     * La geometría se construye con
     * ancho y alto verdaderos en metros.
     */
    const geometry =
      createRectangleFromDimensions(
        [
          center[0],
          center[1],
        ],

        width,
        height,
        rotation,
      );

    const feature =
      new Feature<Geometry>({
        geometry,
      });

    draftSource.addFeature(
      feature,
    );

    exactRectangleFeatureRef.current =
      feature;

    /*
     * Inmediatamente queda disponible
     * para arrastrar.
     */
    const translate =
      new Translate({
        features:
          new Collection([
            feature,
          ]),
      });

    const snap =
      createExChacraSnapInteraction(
        exChacrasSource,
      );

    map.addInteraction(
      translate,
    );

    map.addInteraction(
      snap,
    );

    translateInteractionRef.current =
      translate;

    snapInteractionRef.current =
      snap;

    snapFeedbackCleanupRef.current =
      attachExChacraSnapFeedback(
        map,
        snap,
      );

    setExactRectangleReady(
      true,
    );

    setError(null);
  }

  /*
   * El usuario terminó de ubicar
   * el rectángulo exacto.
   */
  function confirmExactRectangle() {
    const feature =
      exactRectangleFeatureRef.current;

    if (!feature) {
      return;
    }

    try {
      setPendingGeometry(
        featureToGeoJson(
          feature,
        ),
      );

      setNumberValue("");

      setError(null);

      removeInteractions();

      exactRectangleFeatureRef.current =
        null;

      setExactRectangleReady(
        false,
      );

      stopDrawing();
    } catch (
      confirmError
    ) {
      console.error(
        "Error confirmando rectángulo:",
        confirmError,
      );

      setError(
        "No se pudo confirmar el rectángulo.",
      );
    }
  }

  /*
 * --------------------------------------------------
 * DESHACER ÚLTIMO PUNTO
 * --------------------------------------------------
 */
function undoFreePoint() {
  const draw =
    drawInteractionRef.current;

  const constraint =
    fixedLengthInteractionRef.current;

  if (!draw) {
    return;
  }

  draw.removeLastPoint();

  constraint
    ?.removeLastVertex();
}

/*
 * --------------------------------------------------
 * FINALIZAR POLÍGONO
 * --------------------------------------------------
 */
function finishFreePolygon() {
  const draw =
    drawInteractionRef.current;

  const constraint =
    fixedLengthInteractionRef.current;

  if (!draw) {
    return;
  }

  const count =
    constraint
      ?.getVertexCount() ??
    freeVertexCount;

  if (count < 3) {
    setError(
      "Una EXCHACRA necesita al menos tres puntos.",
    );

    return;
  }

  /*
   * Esto dispara normalmente drawend,
   * así que el resto del flujo existente
   * continúa exactamente igual.
   */
  draw.finishDrawing();
}

  /*
   * --------------------------------------------------
   * GUARDAR EN SQLITE
   * --------------------------------------------------
   */
  async function save() {
    if (!pendingGeometry) {
      return;
    }

    const numero =
      Number(numberValue);

    if (
      !Number.isInteger(numero) ||
      numero <= 0
    ) {
      setError(
        "Ingresá un número de EXCHACRA válido.",
      );

      return;
    }

    try {
      setError(null);

      await createExChacra(
        numero,
        pendingGeometry,
      );

      const source =
        exChacrasSourceRef.current;

      if (source) {
        await loadExChacrasIntoSource(
          source,
        );
      }

      draftSourceRef.current
        ?.clear();

      setPendingGeometry(
        null,
      );

      setNumberValue("");

      setError(null);
    } catch (
      saveError
    ) {
      console.error(
        "Error guardando EXCHACRA:",
        saveError,
      );

      setError(
        "No se pudo guardar. Verificá que el número no exista.",
      );
    }
  }

  /*
   * --------------------------------------------------
   * CANCELAR TODO
   * --------------------------------------------------
   */
  function cancelDrawing() {
    removeInteractions();

    draftSourceRef.current
      ?.clear();

    exactRectangleFeatureRef.current =
      null;

    setExactRectangleReady(
      false,
    );

    setPendingGeometry(
      null,
    );

    setNumberValue("");

    setError(null);

    stopDrawing();

    setFreeVertexCount(0);

    setLiveSegmentLength(
      null,
    );

    setLiveSegmentAngle(
      null,
    );
  }

  /*
   * Cancelar solamente el diálogo
   * final del número.
   */
  function cancelNumberDialog() {
    draftSourceRef.current
      ?.clear();

    setPendingGeometry(
      null,
    );

    setNumberValue("");

    setError(null);
  }

  /*
 * --------------------------------------------------
 * ATAJOS DEL MODO LIBRE
 * --------------------------------------------------
 */
useEffect(() => {
  if (
    drawingMode !==
      "exchacra" ||
    drawMode !== "free" ||
    pendingGeometry !== null
  ) {
    return;
  }

  function handleKeyDown(
    event: KeyboardEvent,
  ) {
    const target =
      event.target as
        HTMLElement | null;

    const tagName =
      target?.tagName;

    /*
     * Si estamos escribiendo dentro
     * de un input, no interceptamos
     * Enter ni Backspace.
     */
    const editingInput =
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT";

    /*
     * Esc siempre cancela.
     */
    if (
      event.key === "Escape"
    ) {
      event.preventDefault();

      cancelDrawing();

      return;
    }

    if (editingInput) {
      return;
    }

    if (
      event.key ===
      "Backspace"
    ) {
      event.preventDefault();

      undoFreePoint();

      return;
    }

    if (
      event.key === "Enter"
    ) {
      event.preventDefault();

      finishFreePolygon();
    }
  }

  window.addEventListener(
    "keydown",
    handleKeyDown,
  );

  return () => {
    window.removeEventListener(
      "keydown",
      handleKeyDown,
    );
  };
}, [
  drawingMode,
  drawMode,
  pendingGeometry,
  freeVertexCount,
]);

  return {
    drawMode,
    rectangleMode,

    widthValue,
    heightValue,
    rotationValue,

    exactRectangleReady,

    numberValue,
    error,

    isDrawingPanelOpen:
      drawingMode ===
        "exchacra" &&
      pendingGeometry ===
        null,

    isNumberDialogOpen:
      pendingGeometry !==
      null,

    setWidthValue,
    setHeightValue,
    setRotationValue,

    setNumberValue,

    changeDrawMode,
    changeRectangleMode,

    generateExactRectangle,
    confirmExactRectangle,

    cancelDrawing,

    save,

    cancelNumberDialog,
    fixedLengthEnabled,
    fixedLengthValue,

    freeVertexCount,

    liveSegmentLength,
    liveSegmentAngle,

    setFixedLengthEnabled,
    setFixedLengthValue,

    undoFreePoint,
    finishFreePolygon,
  };
}