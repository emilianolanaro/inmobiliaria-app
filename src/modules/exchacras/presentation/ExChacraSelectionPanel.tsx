import {
  useEffect,
  useState,
} from "react";

import type {
  ExChacraEditorMode,
} from "./useExChacraEditing";

import "./ExChacraSelectionPanel.css";

import type {
  AdjacentDirection,
} from "./drawing/duplicatePlacement";

export interface SelectedExChacra {
  id: string;
  numero: number;
}

interface Props {
  exChacra:
    SelectedExChacra;

  mode:
    ExChacraEditorMode;

  error:
    string | null;

  onClose: () => void;

  onUpdateNumber: (
    value: string,
  ) => Promise<void>;

  onStartShapeEditing:
    () => void;

  onSaveShape:
    () => Promise<void>;

  onCancelShape:
    () => void;

  onDuplicate:
    () => void;

  onDelete:
    () => Promise<void>;

  onDuplicateAdjacent: (
    direction:
      AdjacentDirection,
  ) => void;
}

function ExChacraSelectionPanel({
  exChacra,
  mode,
  error,
  onClose,
  onUpdateNumber,
  onStartShapeEditing,
  onSaveShape,
  onCancelShape,
  onDuplicate,
  onDelete,
  onDuplicateAdjacent,
}: Props) {
  const [
    numberValue,
    setNumberValue,
  ] =
    useState(
      String(
        exChacra.numero,
      ),
    );

  /*
   * Si seleccionamos otra EXCHACRA
   * actualizamos el input.
   */
  useEffect(() => {
    setNumberValue(
      String(
        exChacra.numero,
      ),
    );
  }, [
    exChacra.id,
    exChacra.numero,
  ]);

  /*
   * --------------------------------------------------
   * EDITANDO FORMA
   * --------------------------------------------------
   */
  if (mode === "shape") {
    return (
      <div className="exchacra-selection-panel">
        <div className="exchacra-selection-panel__header">
          <div>
            <span className="exchacra-selection-panel__eyebrow">
              Editando forma
            </span>

            <h3>
              EXCHACRA{" "}
              {exChacra.numero}
            </h3>
          </div>
        </div>

        <p>
          Arrastrá los vértices del
          polígono para modificar su
          tamaño o forma.
        </p>

        {error && (
          <p className="exchacra-selection-panel__error">
            {error}
          </p>
        )}

        <div className="exchacra-selection-panel__actions">
          <button
            type="button"
            onClick={
              onCancelShape
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className="exchacra-selection-panel__primary"
            onClick={() =>
              void onSaveShape()
            }
          >
            Guardar forma
          </button>
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * PANEL NORMAL
   * --------------------------------------------------
   */
  return (
    <div className="exchacra-selection-panel">
      <div className="exchacra-selection-panel__header">
        <div>
          <span className="exchacra-selection-panel__eyebrow">
            Seleccionada
          </span>

          <h3>
            EXCHACRA{" "}
            {exChacra.numero}
          </h3>
        </div>

        {mode === "idle" && (
          <button
            type="button"
            className="exchacra-selection-panel__close"
            onClick={onClose}
            title="Deseleccionar"
          >
            ×
          </button>
        )}
      </div>

      {mode === "idle" && (
        <>
          <div className="exchacra-selection-panel__adjacent">
            <span className="exchacra-selection-panel__adjacent-title">
              Duplicar contigua
            </span>

            <p className="exchacra-selection-panel__adjacent-help">
              Crea una copia del mismo tamaño
              pegada exactamente al borde.
            </p>

            <div className="exchacra-selection-panel__direction-pad">
              <button
                type="button"
                className="direction-up"
                title="Duplicar arriba"
                onClick={() =>
                  onDuplicateAdjacent(
                    "up",
                  )
                }
              >
                ↑
              </button>

              <button
                type="button"
                className="direction-left"
                title="Duplicar a la izquierda"
                onClick={() =>
                  onDuplicateAdjacent(
                    "left",
                  )
                }
              >
                ←
              </button>

              <div className="direction-center">
                {exChacra.numero}
              </div>

              <button
                type="button"
                className="direction-right"
                title="Duplicar a la derecha"
                onClick={() =>
                  onDuplicateAdjacent(
                    "right",
                  )
                }
              >
                →
              </button>

              <button
                type="button"
                className="direction-down"
                title="Duplicar abajo"
                onClick={() =>
                  onDuplicateAdjacent(
                    "down",
                  )
                }
              >
                ↓
              </button>
            </div>
          </div>
          <div className="exchacra-selection-panel__field">
            <label>
              Número
            </label>

            <div className="exchacra-selection-panel__number-row">
              <input
                type="number"
                min="1"
                value={
                  numberValue
                }
                onChange={(
                  event,
                ) =>
                  setNumberValue(
                    event
                      .target
                      .value,
                  )
                }
              />

              <button
                type="button"
                onClick={() =>
                  void onUpdateNumber(
                    numberValue,
                  )
                }
              >
                Guardar
              </button>
            </div>
          </div>

          {error && (
            <p className="exchacra-selection-panel__error">
              {error}
            </p>
          )}

          <div className="exchacra-selection-panel__tools">
            <button
              type="button"
              onClick={
                onStartShapeEditing
              }
            >
              Editar forma
            </button>

            <button
              type="button"
              onClick={
                onDuplicate
              }
            >
              Duplicar
            </button>

            <button
              type="button"
              className="exchacra-selection-panel__danger"
              onClick={() =>
                void onDelete()
              }
            >
              Eliminar
            </button>
          </div>
        </>
      )}

      {mode === "duplicate" && (
        <p>
          Arrastrá la copia roja hasta
          su nueva posición.
        </p>
      )}
    </div>
  );
}

export default ExChacraSelectionPanel;