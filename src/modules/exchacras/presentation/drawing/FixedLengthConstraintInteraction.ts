import Interaction from "ol/interaction/Interaction";

import type MapBrowserEvent from "ol/MapBrowserEvent";

import MapBrowserEventType from "ol/MapBrowserEventType";

import type {
  Coordinate,
} from "ol/coordinate";

import {
  getFixedLengthEndpoint,
  getMetricAngleDegrees,
  getMetricDistance,
} from "./metricGeometry";

import type {
  XYCoordinate,
} from "./metricProjection";

/*
 * Información dinámica del segmento
 * que se está dibujando.
 */
export interface SegmentPreview {
  /*
   * Longitud real en metros.
   */
  lengthMeters: number;

  /*
   * Ángulo:
   *
   * 0°   = Este
   * 90°  = Norte
   * 180° = Oeste
   * 270° = Sur
   */
  angleDegrees: number;

  /*
   * Extremo real que utilizaremos
   * para el segmento.
   */
  endCoordinate: XYCoordinate;

  /*
   * true cuando estamos aplicando
   * una longitud fija.
   */
  constrained: boolean;
}

interface Options {
  /*
   * Devuelve la longitud que debe
   * tener el próximo lado.
   *
   * null = longitud libre.
   */
  getLengthMeters:
    () => number | null;

  /*
   * Se ejecuta constantemente mientras
   * el usuario mueve el cursor.
   */
  onPreview: (
    preview:
      SegmentPreview | null,
  ) => void;

  /*
   * Informa cuántos vértices ya fueron
   * confirmados.
   */
  onVertexCountChange?: (
    count: number,
  ) => void;
}

/*
 * --------------------------------------------------
 * INTERACCIÓN DE LONGITUD FIJA
 * --------------------------------------------------
 *
 * Modifica la coordenada del puntero antes
 * de que Draw la procese.
 *
 * Si el usuario pide un segmento de 100 m:
 *
 *        cursor real
 *             x
 *
 * ●----------------●
 *       100 m
 *
 * Draw recibe la posición del segundo ●,
 * no necesariamente la posición real
 * del mouse.
 */
export default class FixedLengthConstraintInteraction
  extends Interaction {
  /*
   * Puntos ya confirmados.
   */
  private vertices:
    Coordinate[] = [];

  /*
   * Pixel donde comenzó el clic actual.
   *
   * Nos ayuda a distinguir entre
   * clic y arrastre.
   */
  private downPixel:
    [number, number] | null =
    null;

  private readonly getLengthMeters:
    () => number | null;

  private readonly onPreview:
    (
      preview:
        SegmentPreview | null,
    ) => void;

  private readonly onVertexCountChange?:
    (count: number) => void;

  constructor(
    options: Options,
  ) {
    super();

    this.getLengthMeters =
      options.getLengthMeters;

    this.onPreview =
      options.onPreview;

    this.onVertexCountChange =
      options.onVertexCountChange;
  }

  /*
   * Último vértice confirmado.
   */
  private getLastVertex():
    Coordinate | null {
    if (
      this.vertices.length === 0
    ) {
      return null;
    }

    return this.vertices[
      this.vertices.length - 1
    ];
  }

  /*
   * --------------------------------------------------
   * CALCULAR POSICIÓN DEL CURSOR
   * --------------------------------------------------
   */
  private constrainEvent(
    event:
      MapBrowserEvent<PointerEvent>,
  ): void {
    const lastVertex =
      this.getLastVertex();

    /*
     * Sin primer punto todavía no
     * existe ningún segmento.
     */
    if (!lastVertex) {
      this.onPreview(null);

      return;
    }

    const start:
      XYCoordinate = [
        lastVertex[0],
        lastVertex[1],
      ];

    const pointer:
      XYCoordinate = [
        event.coordinate[0],
        event.coordinate[1],
      ];

    const requestedLength =
      this.getLengthMeters();

    let end:
      XYCoordinate = pointer;

    let constrained =
      false;

    /*
     * Si tenemos una longitud fija válida,
     * el mouse solamente determina
     * la dirección.
     */
    if (
      requestedLength !== null &&
      Number.isFinite(
        requestedLength,
      ) &&
      requestedLength > 0
    ) {
      end =
        getFixedLengthEndpoint(
          start,
          pointer,
          requestedLength,
        );

      constrained =
        true;

      /*
       * Esta es la parte fundamental:
       *
       * cambiamos la coordenada del evento
       * que posteriormente recibirá Draw.
       */
      event.coordinate = [
        end[0],
        end[1],
      ];

      /*
       * Draw también utiliza pixel.
       *
       * Hay que mantener ambas cosas
       * sincronizadas.
       */
      const pixel =
        event.map
          .getPixelFromCoordinate(
            event.coordinate,
          );

      event.pixel = [
        Math.round(pixel[0]),
        Math.round(pixel[1]),
      ];
    }

    const actualLength =
      getMetricDistance(
        start,
        end,
      );

    const angle =
      getMetricAngleDegrees(
        start,
        end,
      );

    this.onPreview({
      lengthMeters:
        actualLength,

      angleDegrees:
        angle,

      endCoordinate: [
        end[0],
        end[1],
      ],

      constrained,
    });
  }

  /*
   * --------------------------------------------------
   * EVENTOS DEL PUNTERO
   * --------------------------------------------------
   */
  override handleEvent(
    event:
      MapBrowserEvent<PointerEvent>,
  ): boolean {
    /*
     * Mouse presionado.
     */
    if (
      event.type ===
      MapBrowserEventType.POINTERDOWN
    ) {
      this.constrainEvent(
        event,
      );

      this.downPixel = [
        event.pixel[0],
        event.pixel[1],
      ];

      return true;
    }

    /*
     * Movimiento del cursor.
     *
     * Es lo que genera la vista previa
     * dinámica del lado.
     */
    if (
      event.type ===
      MapBrowserEventType.POINTERMOVE
    ) {
      this.constrainEvent(
        event,
      );

      return true;
    }

    /*
     * Mouse liberado.
     *
     * Si prácticamente no hubo movimiento,
     * lo interpretamos como un clic
     * confirmando un nuevo vértice.
     */
    if (
      event.type ===
      MapBrowserEventType.POINTERUP
    ) {
      this.constrainEvent(
        event,
      );

      if (!this.downPixel) {
        return true;
      }

      const dx =
        event.pixel[0] -
        this.downPixel[0];

      const dy =
        event.pixel[1] -
        this.downPixel[1];

      const clickDistance =
        Math.sqrt(
          dx * dx +
          dy * dy,
        );

      this.downPixel =
        null;

      /*
       * Si hubo bastante movimiento,
       * no contamos esto como un clic.
       */
      if (
        clickDistance > 6
      ) {
        return true;
      }

      /*
       * Guardamos exactamente la coordenada
       * modificada que también recibirá Draw.
       */
      this.vertices.push([
        event.coordinate[0],
        event.coordinate[1],
      ]);

      this.onVertexCountChange?.(
        this.vertices.length,
      );

      return true;
    }

    return true;
  }

  /*
   * --------------------------------------------------
   * DESHACER ÚLTIMO VÉRTICE
   * --------------------------------------------------
   */
  removeLastVertex(): void {
    if (
      this.vertices.length === 0
    ) {
      return;
    }

    this.vertices.pop();

    this.onVertexCountChange?.(
      this.vertices.length,
    );

    this.onPreview(null);
  }

  /*
   * --------------------------------------------------
   * LIMPIAR ESTADO
   * --------------------------------------------------
   */
  reset(): void {
    this.vertices = [];

    this.downPixel =
      null;

    this.onPreview(null);

    this.onVertexCountChange?.(
      0,
    );
  }

  /*
   * Cantidad de vértices
   * confirmados actualmente.
   */
  getVertexCount(): number {
    return this.vertices.length;
  }
}