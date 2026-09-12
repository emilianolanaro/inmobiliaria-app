import {
  useEffect,
  useRef,
} from "react";

import Map from "ol/Map";
import View from "ol/View";

import TileLayer from "ol/layer/Tile";

import OSM from "ol/source/OSM";

import { fromLonLat } from "ol/proj";

import { useMapStore } from "../application/useMapStore";

import ExChacraDialog from "../../exchacras/presentation/ExChacraDialog";

import {
  createExChacraDraftLayer,
  createExChacraLayer,
  type ExChacraVectorSource,
  loadExChacrasIntoSource,
} from "../../exchacras/presentation/exChacraMap";

import { useExChacraCreation } from "../../exchacras/presentation/useExChacraCreation";

import "ol/ol.css";
import "./MapView.css";

/*
 * Centro inicial aproximado de Chajarí.
 *
 * Coordenadas:
 * [longitud, latitud]
 */
const CHAJARI_COORDINATES = [
  -57.98,
  -30.75,
];

function MapView() {
  /*
   * --------------------------------------------------
   * ELEMENTO HTML
   * --------------------------------------------------
   */

  const mapElement =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
   * --------------------------------------------------
   * REFERENCIA AL MAPA
   * --------------------------------------------------
   */

  const mapRef =
    useRef<Map | null>(null);

  /*
   * --------------------------------------------------
   * REFERENCIAS A CAPAS
   * --------------------------------------------------
   *
   * Solamente conservamos referencias a
   * aquellas capas cuya visibilidad debe
   * poder modificarse posteriormente.
   */

  const baseLayerRef =
    useRef<
      TileLayer<OSM> | null
    >(null);

  const exChacrasLayerRef =
    useRef<
      ReturnType<
        typeof createExChacraLayer
      >["layer"] | null
    >(null);

  /*
   * --------------------------------------------------
   * REFERENCIAS A SOURCES
   * --------------------------------------------------
   */

  const exChacrasSourceRef =
    useRef<
      ExChacraVectorSource | null
    >(null);

  const draftSourceRef =
    useRef<
      ExChacraVectorSource | null
    >(null);

  /*
   * --------------------------------------------------
   * ESTADO GLOBAL DEL MAPA
   * --------------------------------------------------
   */

  const baseMapVisible =
    useMapStore(
      (state) =>
        state.baseMapVisible,
    );

  const exChacrasVisible =
    useMapStore(
      (state) =>
        state.layers.exchacras,
    );

  /*
   * --------------------------------------------------
   * CREACIÓN DE EXCHACRAS
   * --------------------------------------------------
   *
   * Toda la lógica de Draw + formulario +
   * guardado se encuentra ahora aislada
   * en este hook.
   */

  const exChacraCreation =
    useExChacraCreation({
      mapRef,
      draftSourceRef,
      exChacrasSourceRef,
    });

  /*
   * --------------------------------------------------
   * INICIALIZAR OPENLAYERS
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!mapElement.current) {
      return;
    }

    /*
     * MAPA BASE
     */
    const baseLayer =
      new TileLayer({
        source: new OSM(),

        visible:
          baseMapVisible,
      });



    /*
     * EXCHACRAS LOCALES
     */
    const exChacras =
      createExChacraLayer(
        exChacrasVisible,
      );

    /*
     * DIBUJO TEMPORAL
     */
    const draft =
      createExChacraDraftLayer();

    /*
     * Guardamos las referencias
     * necesarias para otras operaciones.
     */
    baseLayerRef.current =
      baseLayer;

    exChacrasLayerRef.current =
      exChacras.layer;

    exChacrasSourceRef.current =
      exChacras.source;

    draftSourceRef.current =
      draft.source;

    /*
     * MAPA
     */
    const map =
      new Map({
        target:
          mapElement.current,

        layers: [
          baseLayer,

          /*
           * Catastro propio.
           */
          exChacras.layer,
          /*
           * Dibujo actualmente
           * en edición.
           */
          draft.layer,
        ],

        view: new View({
          center: fromLonLat(
            CHAJARI_COORDINATES,
          ),

          zoom: 14,
        }),
      });

    mapRef.current = map;

    /*
     * CARGAR EXCHACRAS DESDE SQLITE
     */
    void loadExChacrasIntoSource(
      exChacras.source,
    ).catch((error) => {
      console.error(
        "Error cargando EXCHACRAS:",
        error,
      );
    });

    /*
     * CLEANUP
     */
    return () => {
      map.setTarget(undefined);

      mapRef.current = null;

      baseLayerRef.current =
        null;

      exChacrasLayerRef.current =
        null;

      exChacrasSourceRef.current =
        null;

      draftSourceRef.current =
        null;
    };
  }, []);

  /*
   * --------------------------------------------------
   * VISIBILIDAD MAPA BASE
   * --------------------------------------------------
   */

  useEffect(() => {
    baseLayerRef.current
      ?.setVisible(
        baseMapVisible,
      );
  }, [baseMapVisible]);

  /*
   * --------------------------------------------------
   * VISIBILIDAD EXCHACRAS
   * --------------------------------------------------
   */

  useEffect(() => {
    exChacrasLayerRef.current
      ?.setVisible(
        exChacrasVisible,
      );
  }, [exChacrasVisible]);

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  return (
    <div className="map-container">
      <div
        ref={mapElement}
        className="map"
      />

      {exChacraCreation
        .isDialogOpen && (
        <ExChacraDialog
          numberValue={
            exChacraCreation
              .numberValue
          }
          error={
            exChacraCreation.error
          }
          onNumberChange={
            exChacraCreation
              .setNumberValue
          }
          onCancel={
            exChacraCreation.cancel
          }
          onSave={() =>
            void exChacraCreation
              .save()
          }
        />
      )}
    </div>
  );
}

export default MapView;