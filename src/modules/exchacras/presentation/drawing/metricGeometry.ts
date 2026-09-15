import Polygon from "ol/geom/Polygon";

import type {
  GeometryFunction,
} from "ol/interaction/Draw";

import {
  displayToMetric,
  metricToDisplay,
  type XYCoordinate,
} from "./metricProjection";

/*
 * Rota un punto alrededor del origen.
 *
 * angleRadians:
 *
 * 0°  -> Este
 * 90° -> Norte
 */
function rotatePoint(
  x: number,
  y: number,
  angleRadians: number,
): XYCoordinate {
  const cos =
    Math.cos(angleRadians);

  const sin =
    Math.sin(angleRadians);

  return [
    x * cos - y * sin,
    x * sin + y * cos,
  ];
}

/*
 * --------------------------------------------------
 * RECTÁNGULO POR DIAGONAL
 * --------------------------------------------------
 *
 * El usuario indica:
 *
 * punto 1
 *    ●
 *     \
 *      \
 *       ● punto 2
 *
 * Y generamos el rectángulo correspondiente.
 *
 * Importante:
 * los cálculos se hacen en EPSG:5348,
 * no en Web Mercator.
 */
export function createMetricBoxGeometryFunction():
  GeometryFunction {
  return (
    coordinates,
    geometry,
  ) => {
    /*
     * Cuando Draw utiliza type "Circle",
     * OpenLayers nos entrega:
     *
     * [primer punto, posición actual]
     */
    const points =
      coordinates as XYCoordinate[];

    const startDisplay =
      points[0];

    const endDisplay =
      points[
        points.length - 1
      ];

    const start =
      displayToMetric(
        startDisplay,
      );

    const end =
      displayToMetric(
        endDisplay,
      );

    const minX =
      Math.min(
        start[0],
        end[0],
      );

    const maxX =
      Math.max(
        start[0],
        end[0],
      );

    const minY =
      Math.min(
        start[1],
        end[1],
      );

    const maxY =
      Math.max(
        start[1],
        end[1],
      );

    /*
     * Rectángulo construido en metros.
     */
    const metricRing:
      XYCoordinate[] = [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ];

    /*
     * Lo transformamos nuevamente a
     * EPSG:3857 para mostrarlo.
     */
    const displayRing =
      metricRing.map(
        metricToDisplay,
      );

    const polygon =
      geometry instanceof Polygon
        ? geometry
        : new Polygon([]);

    polygon.setCoordinates([
      displayRing,
    ]);

    return polygon;
  };
}

/*
 * --------------------------------------------------
 * RECTÁNGULO CON DIMENSIONES EXACTAS
 * --------------------------------------------------
 *
 * Por ejemplo:
 *
 * ancho = 100 m
 * alto  = 80 m
 * ángulo = 0°
 *
 * El rectángulo se construye alrededor
 * de un punto central.
 */
export function createRectangleFromDimensions(
  centerDisplay:
    XYCoordinate,

  widthMeters: number,

  heightMeters: number,

  rotationDegrees = 0,
): Polygon {
  const center =
    displayToMetric(
      centerDisplay,
    );

  const halfWidth =
    widthMeters / 2;

  const halfHeight =
    heightMeters / 2;

  const angle =
    rotationDegrees *
    Math.PI /
    180;

  /*
   * Esquinas respecto del centro.
   */
  const localCorners:
    XYCoordinate[] = [
      [
        -halfWidth,
        -halfHeight,
      ],

      [
        halfWidth,
        -halfHeight,
      ],

      [
        halfWidth,
        halfHeight,
      ],

      [
        -halfWidth,
        halfHeight,
      ],
    ];

  /*
   * Rotamos y trasladamos.
   */
  const metricCorners =
    localCorners.map(
      ([x, y]) => {
        const rotated =
          rotatePoint(
            x,
            y,
            angle,
          );

        return [
          center[0] +
            rotated[0],

          center[1] +
            rotated[1],
        ] as XYCoordinate;
      },
    );

  /*
   * Cerramos el anillo.
   */
  metricCorners.push([
    metricCorners[0][0],
    metricCorners[0][1],
  ]);

  const displayCorners =
    metricCorners.map(
      metricToDisplay,
    );

  return new Polygon([
    displayCorners,
  ]);
}

/*
 * --------------------------------------------------
 * DISTANCIA REAL EN METROS
 * --------------------------------------------------
 *
 * La vamos a reutilizar después para:
 *
 * - segmentos de longitud fija;
 * - etiquetas dinámicas;
 * - validaciones;
 * - ancho/alto;
 * - snapping CAD.
 */
export function getMetricDistance(
  startDisplay:
    XYCoordinate,

  endDisplay:
    XYCoordinate,
): number {
  const start =
    displayToMetric(
      startDisplay,
    );

  const end =
    displayToMetric(
      endDisplay,
    );

  const dx =
    end[0] - start[0];

  const dy =
    end[1] - start[1];

  return Math.sqrt(
    dx * dx +
    dy * dy,
  );
}

/*
 * --------------------------------------------------
 * PUNTO A LONGITUD FIJA
 * --------------------------------------------------
 *
 * Esta función todavía no se conecta
 * al Draw libre en esta tanda.
 *
 * La dejamos preparada porque será el
 * núcleo del próximo paso.
 *
 * start + dirección del mouse + longitud.
 */
export function getFixedLengthEndpoint(
  startDisplay:
    XYCoordinate,

  pointerDisplay:
    XYCoordinate,

  lengthMeters: number,
): XYCoordinate {
  const start =
    displayToMetric(
      startDisplay,
    );

  const pointer =
    displayToMetric(
      pointerDisplay,
    );

  const dx =
    pointer[0] -
    start[0];

  const dy =
    pointer[1] -
    start[1];

  const currentLength =
    Math.sqrt(
      dx * dx +
      dy * dy,
    );

  if (currentLength === 0) {
    return startDisplay;
  }

  /*
   * Vector unitario.
   */
  const ux =
    dx / currentLength;

  const uy =
    dy / currentLength;

  /*
   * Aplicamos exactamente
   * la longitud indicada.
   */
  const endpoint:
    XYCoordinate = [
      start[0] +
        ux * lengthMeters,

      start[1] +
        uy * lengthMeters,
    ];

  return metricToDisplay(
    endpoint,
  );
}

/*
 * --------------------------------------------------
 * ÁNGULO DE UN SEGMENTO
 * --------------------------------------------------
 *
 * Calculamos el ángulo utilizando nuestra
 * proyección métrica EPSG:5348.
 *
 * Convención:
 *
 *   0°   = Este
 *   90°  = Norte
 *   180° = Oeste
 *   270° = Sur
 */
export function getMetricAngleDegrees(
  startDisplay: XYCoordinate,
  endDisplay: XYCoordinate,
): number {
  const start =
    displayToMetric(
      startDisplay,
    );

  const end =
    displayToMetric(
      endDisplay,
    );

  const dx =
    end[0] - start[0];

  const dy =
    end[1] - start[1];

  let degrees =
    Math.atan2(dy, dx) *
    180 /
    Math.PI;

  /*
   * Convertimos -180..180
   * en 0..360.
   */
  if (degrees < 0) {
    degrees += 360;
  }

  return degrees;
}