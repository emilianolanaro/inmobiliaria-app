import type {
  ExChacraDrawMode,
  RectangleDrawMode,
} from "./drawing/drawingTypes";

import "./ExChacraDrawingPanel.css";

interface Props {
  drawMode:
    ExChacraDrawMode;

  rectangleMode:
    RectangleDrawMode;

  widthValue: string;
  heightValue: string;
  rotationValue: string;

  exactRectangleReady:
    boolean;

  error:
    string | null;

  onDrawModeChange: (
    mode: ExChacraDrawMode,
  ) => void;

  onRectangleModeChange: (
    mode: RectangleDrawMode,
  ) => void;

  onWidthChange: (
    value: string,
  ) => void;

  onHeightChange: (
    value: string,
  ) => void;

  onRotationChange: (
    value: string,
  ) => void;

  onGenerateRectangle:
    () => void;

  onConfirmRectangle:
    () => void;

  onCancel:
    () => void;

  fixedLengthEnabled:
    boolean;

  fixedLengthValue:
    string;

  freeVertexCount:
    number;

  liveSegmentLength:
    number | null;

  liveSegmentAngle:
    number | null;

  onFixedLengthEnabledChange: (
    enabled: boolean,
  ) => void;

  onFixedLengthValueChange: (
    value: string,
  ) => void;

  onUndoFreePoint:
    () => void;

  onFinishFreePolygon:
    () => void;
}

function ExChacraDrawingPanel({
  drawMode,
  rectangleMode,
  widthValue,
  heightValue,
  rotationValue,
  exactRectangleReady,
  error,

  fixedLengthEnabled,
  fixedLengthValue,
  freeVertexCount,
  liveSegmentLength,
  liveSegmentAngle,

  onDrawModeChange,
  onRectangleModeChange,
  onWidthChange,
  onHeightChange,
  onRotationChange,
  onGenerateRectangle,
  onConfirmRectangle,

  onFixedLengthEnabledChange,
  onFixedLengthValueChange,
  onUndoFreePoint,
  onFinishFreePolygon,
  onCancel,
}: Props) {
  return (
    <div className="exchacra-drawing-panel">
      <div className="exchacra-drawing-panel__header">
        <div>
          <span className="exchacra-drawing-panel__eyebrow">
            Herramienta de dibujo
          </span>

          <h3>
            Nueva EXCHACRA
          </h3>
        </div>
      </div>

      <div className="exchacra-drawing-panel__section">
        <span className="exchacra-drawing-panel__label">
          Modo
        </span>

        <div className="exchacra-drawing-panel__segmented">
          <button
            type="button"
            className={
              drawMode ===
              "rectangle"
                ? "is-active"
                : ""
            }
            onClick={() =>
              onDrawModeChange(
                "rectangle",
              )
            }
          >
            Rectángulo
          </button>

          <button
            type="button"
            className={
              drawMode ===
              "free"
                ? "is-active"
                : ""
            }
            onClick={() =>
              onDrawModeChange(
                "free",
              )
            }
          >
            Libre
          </button>
        </div>
      </div>

      {drawMode ===
        "rectangle" && (
        <>
          <div className="exchacra-drawing-panel__section">
            <span className="exchacra-drawing-panel__label">
              Construcción
            </span>

            <div className="exchacra-drawing-panel__segmented">
              <button
                type="button"
                className={
                  rectangleMode ===
                  "diagonal"
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  onRectangleModeChange(
                    "diagonal",
                  )
                }
              >
                Diagonal
              </button>

              <button
                type="button"
                className={
                  rectangleMode ===
                  "dimensions"
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  onRectangleModeChange(
                    "dimensions",
                  )
                }
              >
                Medidas
              </button>
            </div>
          </div>

          {rectangleMode ===
            "diagonal" && (
            <p className="exchacra-drawing-panel__help">
              Marcá una esquina y
              después la esquina
              opuesta del rectángulo.
            </p>
          )}

          {rectangleMode ===
            "dimensions" && (
            <>
              <div className="exchacra-drawing-panel__grid">
                <label>
                  Ancho
                  <div className="exchacra-drawing-panel__unit">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        widthValue
                      }
                      onChange={(
                        event,
                      ) =>
                        onWidthChange(
                          event
                            .target
                            .value,
                        )
                      }
                    />

                    <span>
                      m
                    </span>
                  </div>
                </label>

                <label>
                  Alto
                  <div className="exchacra-drawing-panel__unit">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        heightValue
                      }
                      onChange={(
                        event,
                      ) =>
                        onHeightChange(
                          event
                            .target
                            .value,
                        )
                      }
                    />

                    <span>
                      m
                    </span>
                  </div>
                </label>
              </div>

              <label className="exchacra-drawing-panel__rotation">
                Ángulo

                <div className="exchacra-drawing-panel__unit">
                  <input
                    type="number"
                    step="0.1"
                    value={
                      rotationValue
                    }
                    onChange={(
                      event,
                    ) =>
                      onRotationChange(
                        event
                          .target
                          .value,
                      )
                    }
                  />

                  <span>
                    °
                  </span>
                </div>
              </label>

              {!exactRectangleReady ? (
                <button
                  type="button"
                  className="exchacra-drawing-panel__primary"
                  onClick={
                    onGenerateRectangle
                  }
                >
                  Crear rectángulo
                </button>
              ) : (
                <>
                  <p className="exchacra-drawing-panel__help">
                    Arrastrá el
                    rectángulo rojo hasta
                    su ubicación correcta.
                  </p>

                  <button
                    type="button"
                    className="exchacra-drawing-panel__primary"
                    onClick={
                      onConfirmRectangle
                    }
                  >
                    Confirmar posición
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}

      {drawMode === "free" && (
        <>
          <div className="exchacra-drawing-panel__free-options">
            <label className="exchacra-drawing-panel__checkbox">
              <input
                type="checkbox"
                checked={
                  fixedLengthEnabled
                }
                onChange={(event) =>
                  onFixedLengthEnabledChange(
                    event.target.checked,
                  )
                }
              />

              Longitud fija
            </label>

            {fixedLengthEnabled && (
              <label className="exchacra-drawing-panel__fixed-length">
                Longitud del próximo lado

                <div className="exchacra-drawing-panel__unit">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      fixedLengthValue
                    }
                    onChange={(event) =>
                      onFixedLengthValueChange(
                        event.target.value,
                      )
                    }
                  />

                  <span>
                    m
                  </span>
                </div>
              </label>
            )}
          </div>

          <div className="exchacra-drawing-panel__live-info">
            <span>
              Puntos:
              {" "}
              <strong>
                {freeVertexCount}
              </strong>
            </span>

            {liveSegmentLength !== null && (
              <span>
                Lado:
                {" "}
                <strong>
                  {liveSegmentLength.toFixed(
                    2,
                  )}
                  {" "}
                  m
                </strong>
              </span>
            )}

            {liveSegmentAngle !== null && (
              <span>
                Ángulo:
                {" "}
                <strong>
                  {liveSegmentAngle.toFixed(
                    1,
                  )}
                  °
                </strong>
              </span>
            )}
          </div>

          <p className="exchacra-drawing-panel__help">
            Hacé clic para fijar cada
            vértice. Si activás longitud
            fija, el mouse solamente
            determina la dirección del
            próximo lado.
          </p>

          <div className="exchacra-drawing-panel__free-actions">
            <button
              type="button"
              disabled={
                freeVertexCount === 0
              }
              onClick={
                onUndoFreePoint
              }
            >
              Deshacer punto
            </button>

            <button
              type="button"
              className="exchacra-drawing-panel__primary"
              disabled={
                freeVertexCount < 3
              }
              onClick={
                onFinishFreePolygon
              }
            >
              Finalizar polígono
            </button>
          </div>

          <p className="exchacra-drawing-panel__shortcuts">
            <strong>Enter</strong>
            {" "}
            finalizar ·
            {" "}
            <strong>Backspace</strong>
            {" "}
            deshacer ·
            {" "}
            <strong>Esc</strong>
            {" "}
            cancelar
          </p>
        </>
      )}

      {error && (
        <p className="exchacra-drawing-panel__error">
          {error}
        </p>
      )}

      <button
        type="button"
        className="exchacra-drawing-panel__cancel"
        onClick={onCancel}
      >
        Cancelar dibujo
      </button>
    </div>
  );
}

export default ExChacraDrawingPanel;