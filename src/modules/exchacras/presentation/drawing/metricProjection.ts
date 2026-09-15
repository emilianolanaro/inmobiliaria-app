import proj4 from "proj4";

import {
  transform,
} from "ol/proj";

import {
  register,
} from "ol/proj/proj4";

/*
 * --------------------------------------------------
 * PROYECCIONES DEL SISTEMA
 * --------------------------------------------------
 *
 * EPSG:3857
 *   OpenLayers / mapas web.
 *
 * EPSG:4326
 *   Formato utilizado para persistir GeoJSON.
 *
 * EPSG:5348
 *   POSGAR 2007 / Argentina 6.
 *   Unidad: metros.
 *
 * Todas las operaciones donde necesitamos
 * dimensiones reales se hacen en EPSG:5348.
 */

export const DISPLAY_PROJECTION =
  "EPSG:3857";

export const STORAGE_PROJECTION =
  "EPSG:4326";

export const METRIC_PROJECTION =
  "EPSG:5348";

/*
 * Coordenada XY simple.
 */
export type XYCoordinate = [
  number,
  number,
];

let registered = false;

/*
 * Registramos EPSG:5348 una sola vez.
 */
export function ensureMetricProjectionRegistered():
  void {
  if (registered) {
    return;
  }

  proj4.defs(
    METRIC_PROJECTION,

    [
      "+proj=tmerc",
      "+lat_0=-90",
      "+lon_0=-57",
      "+k=1",
      "+x_0=6500000",
      "+y_0=0",
      "+ellps=WGS84",
      "+towgs84=-0.41,0.46,-0.35,0,0,0,0",
      "+units=m",
      "+no_defs",
      "+type=crs",
    ].join(" "),
  );

  /*
   * Hacemos que OpenLayers conozca
   * las definiciones registradas
   * dentro de Proj4.
   */
  register(proj4);

  registered = true;
}

/*
 * --------------------------------------------------
 * MAPA -> METROS
 * --------------------------------------------------
 */
export function displayToMetric(
  coordinate: XYCoordinate,
): XYCoordinate {
  ensureMetricProjectionRegistered();

  const result =
    transform(
      coordinate,
      DISPLAY_PROJECTION,
      METRIC_PROJECTION,
    );

  return [
    result[0],
    result[1],
  ];
}

/*
 * --------------------------------------------------
 * METROS -> MAPA
 * --------------------------------------------------
 */
export function metricToDisplay(
  coordinate: XYCoordinate,
): XYCoordinate {
  ensureMetricProjectionRegistered();

  const result =
    transform(
      coordinate,
      METRIC_PROJECTION,
      DISPLAY_PROJECTION,
    );

  return [
    result[0],
    result[1],
  ];
}