import Feature from "ol/Feature";

import type Geometry from "ol/geom/Geometry";

import Polygon from "ol/geom/Polygon";
import MultiPolygon from "ol/geom/MultiPolygon";

import type {
  Coordinate,
} from "ol/coordinate";

import type {
  ExChacraVectorSource,
} from "../exChacraMap";

import {
  displayToMetric,
  metricToDisplay,
  type XYCoordinate,
} from "./metricProjection";

/*
 * Dirección relativa a los propios
 * ejes del rectángulo.
 *
 * Esto significa que un rectángulo
 * rotado también se duplica siguiendo
 * su propia orientación.
 */
export type AdjacentDirection =
  | "left"
  | "right"
  | "up"
  | "down";

/*
 * --------------------------------------------------
 * UTILIDADES
 * --------------------------------------------------
 */

function toXY(
  coordinate: Coordinate,
): XYCoordinate {
  return [
    coordinate[0],
    coordinate[1],
  ];
}

function distance(
  a: XYCoordinate,
  b: XYCoordinate,
): number {
  const dx =
    b[0] - a[0];

  const dy =
    b[1] - a[1];

  return Math.sqrt(
    dx * dx +
    dy * dy,
  );
}

function vectorLength(
  vector: XYCoordinate,
): number {
  return Math.sqrt(
    vector[0] * vector[0] +
    vector[1] * vector[1],
  );
}

function subtract(
  end: XYCoordinate,
  start: XYCoordinate,
): XYCoordinate {
  return [
    end[0] - start[0],
    end[1] - start[1],
  ];
}

/*
 * Elimina el último punto de un anillo
 * cuando es una repetición del primero.
 *
 * GeoJSON / OpenLayers cierran los
 * polígonos de esta manera:
 *
 * A B C D A
 *
 * Para cálculos queremos solamente:
 *
 * A B C D
 */
function getOpenRing(
  ring: Coordinate[],
): XYCoordinate[] {
  const coordinates =
    ring.map(toXY);

  if (
    coordinates.length >= 2
  ) {
    const first =
      coordinates[0];

    const last =
      coordinates[
        coordinates.length - 1
      ];

    if (
      first[0] === last[0] &&
      first[1] === last[1]
    ) {
      return coordinates.slice(
        0,
        -1,
      );
    }
  }

  return coordinates;
}

/*
 * --------------------------------------------------
 * VALIDAR RECTÁNGULO
 * --------------------------------------------------
 *
 * La duplicación automática ← ↑ ↓ →
 * está pensada para los rectángulos
 * construidos por nuestro editor.
 *
 * Si una EXCHACRA fue modificada hasta
 * dejar de ser rectangular, no queremos
 * posicionarla incorrectamente.
 */
function validateRectangle(
  metricPoints: XYCoordinate[],
): void {
  if (
    metricPoints.length !== 4
  ) {
    throw new Error(
      "La duplicación contigua solamente está disponible para rectángulos de cuatro vértices.",
    );
  }

  const sideA =
    subtract(
      metricPoints[1],
      metricPoints[0],
    );

  const sideB =
    subtract(
      metricPoints[2],
      metricPoints[1],
    );

  const sideC =
    subtract(
      metricPoints[3],
      metricPoints[2],
    );

  const sideD =
    subtract(
      metricPoints[0],
      metricPoints[3],
    );

  const lengthA =
    vectorLength(sideA);

  const lengthB =
    vectorLength(sideB);

  const lengthC =
    vectorLength(sideC);

  const lengthD =
    vectorLength(sideD);

  if (
    lengthA === 0 ||
    lengthB === 0 ||
    lengthC === 0 ||
    lengthD === 0
  ) {
    throw new Error(
      "El rectángulo tiene lados inválidos.",
    );
  }

  /*
   * Producto escalar normalizado.
   *
   * En un rectángulo los lados
   * consecutivos tienen que estar
   * aproximadamente a 90°.
   */
  const perpendicular =
    Math.abs(
      sideA[0] * sideB[0] +
      sideA[1] * sideB[1],
    ) /
    (
      lengthA *
      lengthB
    );

  /*
   * Permitimos una tolerancia pequeña
   * por transformaciones de proyección.
   */
  if (
    perpendicular > 0.02
  ) {
    throw new Error(
      "La geometría seleccionada ya no es un rectángulo regular.",
    );
  }

  /*
   * Los lados opuestos deberían tener
   * prácticamente la misma longitud.
   */
  const oppositeA =
    Math.abs(
      lengthA - lengthC,
    ) /
    Math.max(
      lengthA,
      lengthC,
    );

  const oppositeB =
    Math.abs(
      lengthB - lengthD,
    ) /
    Math.max(
      lengthB,
      lengthD,
    );

  if (
    oppositeA > 0.02 ||
    oppositeB > 0.02
  ) {
    throw new Error(
      "La geometría seleccionada ya no conserva una forma rectangular.",
    );
  }
}

/*
 * --------------------------------------------------
 * DUPLICAR RECTÁNGULO CONTIGUO
 * --------------------------------------------------
 *
 * Supongamos:
 *
 * A────B
 * │    │
 * D────C
 *
 * Para duplicar a la derecha usamos:
 *
 * B - A
 *
 * como desplazamiento completo.
 *
 * No hay aproximación ni movimiento
 * mediante píxeles.
 *
 * Todo se calcula en EPSG:5348,
 * es decir, en metros.
 */
export function createAdjacentRectangleGeometry(
  geometry: Geometry,
  direction: AdjacentDirection,
): Polygon {
  if (
    !(geometry instanceof Polygon)
  ) {
    throw new Error(
      "La duplicación contigua requiere una geometría Polygon.",
    );
  }

  const rings =
    geometry.getCoordinates();

  const displayPoints =
    getOpenRing(
      rings[0],
    );

  const metricPoints =
    displayPoints.map(
      displayToMetric,
    );

  validateRectangle(
    metricPoints,
  );

  /*
   * A → B
   *
   * eje horizontal propio
   * del rectángulo.
   */
  const horizontal =
    subtract(
      metricPoints[1],
      metricPoints[0],
    );

  /*
   * A → D
   *
   * eje vertical propio
   * del rectángulo.
   */
  const vertical =
    subtract(
      metricPoints[3],
      metricPoints[0],
    );

  let delta:
    XYCoordinate;

  switch (direction) {
    case "right":
      delta = horizontal;
      break;

    case "left":
      delta = [
        -horizontal[0],
        -horizontal[1],
      ];
      break;

    case "up":
      delta = vertical;
      break;

    case "down":
      delta = [
        -vertical[0],
        -vertical[1],
      ];
      break;
  }

  /*
   * Movemos cada vértice EN METROS.
   */
  const movedMetric =
    metricPoints.map(
      (point) =>
        [
          point[0] +
            delta[0],

          point[1] +
            delta[1],
        ] as XYCoordinate,
    );

  /*
   * Cerramos el anillo.
   */
  movedMetric.push([
    movedMetric[0][0],
    movedMetric[0][1],
  ]);

  /*
   * Convertimos nuevamente a la
   * proyección visual de OpenLayers.
   */
  const movedDisplay =
    movedMetric.map(
      metricToDisplay,
    );

  return new Polygon([
    movedDisplay,
  ]);
}

/*
 * --------------------------------------------------
 * MOVER UNA GEOMETRÍA EN METROS
 * --------------------------------------------------
 *
 * La utilizaremos también para el
 * Snap de una copia completa.
 */
function moveGeometryMetric(
  geometry: Geometry,
  deltaX: number,
  deltaY: number,
): Geometry {
  if (
    geometry instanceof Polygon
  ) {
    const coordinates =
      geometry
        .getCoordinates()
        .map(
          (ring) =>
            ring.map(
              (coordinate) => {
                const metric =
                  displayToMetric(
                    toXY(
                      coordinate,
                    ),
                  );

                return metricToDisplay([
                  metric[0] +
                    deltaX,

                  metric[1] +
                    deltaY,
                ]);
              },
            ),
        );

    return new Polygon(
      coordinates,
    );
  }

  if (
    geometry instanceof MultiPolygon
  ) {
    const coordinates =
      geometry
        .getCoordinates()
        .map(
          (polygon) =>
            polygon.map(
              (ring) =>
                ring.map(
                  (
                    coordinate,
                  ) => {
                    const metric =
                      displayToMetric(
                        toXY(
                          coordinate,
                        ),
                      );

                    return metricToDisplay([
                      metric[0] +
                        deltaX,

                      metric[1] +
                        deltaY,
                    ]);
                  },
                ),
            ),
        );

    return new MultiPolygon(
      coordinates,
    );
  }

  throw new Error(
    "La geometría no es compatible con el ajuste automático.",
  );
}

/*
 * --------------------------------------------------
 * PUNTOS DE SNAP DE UNA GEOMETRÍA
 * --------------------------------------------------
 *
 * No usamos solamente las esquinas.
 *
 * También utilizamos el centro de cada
 * borde:
 *
 * ●────○────●
 *
 * Eso permite que al arrastrar una copia
 * cerca del lateral de otra EXCHACRA,
 * ambas puedan alinearse lado-con-lado.
 */

type SnapAnchorKind =
  | "vertex"
  | "edge-midpoint";

interface SnapAnchor {
  point: XYCoordinate;

  kind: SnapAnchorKind;
}

function getPolygonAnchors(
  ring: Coordinate[],
): SnapAnchor[] {
  const displayPoints =
    getOpenRing(ring);

  const points =
    displayPoints.map(
      displayToMetric,
    );

  const anchors:
    SnapAnchor[] = [];

  /*
   * Vértices.
   */
  for (
    const point
    of points
  ) {
    anchors.push({
      point,
      kind: "vertex",
    });
  }

  /*
   * Centros de los bordes.
   */
  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const current =
      points[index];

    const next =
      points[
        (
          index + 1
        ) %
        points.length
      ];

    anchors.push({
      point: [
        (
          current[0] +
          next[0]
        ) / 2,

        (
          current[1] +
          next[1]
        ) / 2,
      ],

      kind:
        "edge-midpoint",
    });
  }

  return anchors;
}

function getGeometryAnchors(
  geometry: Geometry,
): SnapAnchor[] {
  if (
    geometry instanceof Polygon
  ) {
    return getPolygonAnchors(
      geometry
        .getCoordinates()[0],
    );
  }

  if (
    geometry instanceof MultiPolygon
  ) {
    return geometry
      .getCoordinates()
      .flatMap(
        (polygon) =>
          getPolygonAnchors(
            polygon[0],
          ),
      );
  }

  return [];
}

/*
 * --------------------------------------------------
 * SNAP DEL POLÍGONO COMPLETO
 * --------------------------------------------------
 *
 * A diferencia del Snap normal de
 * OpenLayers, acá no ajustamos el cursor.
 *
 * Ajustamos TODA LA GEOMETRÍA.
 *
 * Eso permite:
 *
 * ┌──────────┐    ┌──────────┐
 * │    95    │    │ copia    │
 * └──────────┘    └──────────┘
 *
 *              ↓ acercar
 *
 * ┌──────────┐┌──────────┐
 * │    95    ││    96    │
 * └──────────┘└──────────┘
 */
export function snapFeatureToExistingExChacras(
  movingFeature:
    Feature<Geometry>,

  source:
    ExChacraVectorSource,

  toleranceMeters = 8,
): boolean {
  const movingGeometry =
    movingFeature
      .getGeometry();

  if (!movingGeometry) {
    return false;
  }

  const movingAnchors =
    getGeometryAnchors(
      movingGeometry,
    );

  if (
    movingAnchors.length === 0
  ) {
    return false;
  }

  let bestDistance =
    Number.POSITIVE_INFINITY;

  let bestDelta:
    XYCoordinate | null =
    null;

  for (
    const targetFeature
    of source.getFeatures()
  ) {
    /*
     * Normalmente movingFeature no está
     * dentro del source principal, pero
     * dejamos la protección igualmente.
     */
    if (
      targetFeature ===
      movingFeature
    ) {
      continue;
    }

    const targetGeometry =
      targetFeature
        .getGeometry();

    if (!targetGeometry) {
      continue;
    }

    const targetAnchors =
      getGeometryAnchors(
        targetGeometry,
      );

    for (
      const movingAnchor
      of movingAnchors
    ) {
      for (
        const targetAnchor
        of targetAnchors
      ) {
        /*
         * Vértice se compara con vértice.
         *
         * Centro de borde se compara con
         * centro de borde.
         *
         * Así evitamos alineaciones raras.
         */
        if (
          movingAnchor.kind !==
          targetAnchor.kind
        ) {
          continue;
        }

        const candidateDistance =
          distance(
            movingAnchor.point,
            targetAnchor.point,
          );

        if (
          candidateDistance <
          bestDistance
        ) {
          bestDistance =
            candidateDistance;

          bestDelta = [
            targetAnchor
              .point[0] -
              movingAnchor
                .point[0],

            targetAnchor
              .point[1] -
              movingAnchor
                .point[1],
          ];
        }
      }
    }
  }

  /*
   * Demasiado lejos:
   * no hacemos nada.
   */
  if (
    !bestDelta ||
    bestDistance >
      toleranceMeters
  ) {
    return false;
  }

  /*
   * Trasladamos la geometría completa
   * usando el delta calculado EN METROS.
   */
  const snappedGeometry =
    moveGeometryMetric(
      movingGeometry,
      bestDelta[0],
      bestDelta[1],
    );

  movingFeature.setGeometry(
    snappedGeometry,
  );

  movingFeature.changed();

  return true;
}