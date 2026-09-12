import "./ExChacraDialog.css";

interface ExChacraDialogProps {
  /*
   * Permite reutilizar este formulario
   * tanto para Crear como para Duplicar.
   */
  title?: string;

  description?: string;

  saveLabel?: string;

  numberValue: string;

  error: string | null;

  onNumberChange: (
    value: string,
  ) => void;

  onCancel: () => void;

  onSave: () => void;
}

function ExChacraDialog({
  title =
    "Nueva EXCHACRA",

  description,

  saveLabel =
    "Guardar",

  numberValue,

  error,

  onNumberChange,

  onCancel,

  onSave,
}: ExChacraDialogProps) {
  return (
    <div className="exchacra-dialog">
      <h3>
        {title}
      </h3>

      {description && (
        <p className="exchacra-dialog__description">
          {description}
        </p>
      )}

      <label>
        Número

        <input
          type="number"
          min="1"
          autoFocus
          value={numberValue}
          onChange={(event) =>
            onNumberChange(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter"
            ) {
              onSave();
            }
          }}
        />
      </label>

      {error && (
        <p className="exchacra-dialog__error">
          {error}
        </p>
      )}

      <div className="exchacra-dialog__actions">
        <button
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="exchacra-dialog__save"
          onClick={onSave}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

export default ExChacraDialog;