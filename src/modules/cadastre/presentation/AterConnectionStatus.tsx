import { useEffect, useState } from "react";

import type { CadastreLayer } from "../domain/CadastreLayer";

import { getAterCatalog } from "../application/getAterCatalog";

type ConnectionState =
  | "loading"
  | "connected"
  | "error";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function AterConnectionStatus() {
  const [status, setStatus] =
    useState<ConnectionState>("loading");

  const [layers, setLayers] = useState<CadastreLayer[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const result = await getAterCatalog();

        if (cancelled) {
          return;
        }

        setLayers(result);
        setStatus("connected");
      } catch (error) {
        console.error("Error conectando con ATER:", error);

        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <span className="ater-status ater-status--loading">
        ATER: conectando...
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="ater-status ater-status--error">
        ATER: sin conexión
      </span>
    );
  }

  const blockLayer = layers.find((layer) => {
    const text = normalize(
      `${layer.name} ${layer.title}`,
    );

    return text.includes("manzan");
  });

  const parcelLayer = layers.find((layer) => {
    const text = normalize(
      `${layer.name} ${layer.title}`,
    );

    return text.includes("parcel");
  });

  const title = [
    `Capas detectadas: ${layers.length}`,
    blockLayer
      ? `Manzanas: ${blockLayer.name}`
      : "Manzanas: no detectada",
    parcelLayer
      ? `Parcelas: ${parcelLayer.name}`
      : "Parcelas: no detectada",
  ].join("\n");

  return (
    <span
      className="ater-status ater-status--connected"
      title={title}
    >
      ATER: conectado · {layers.length} capas
    </span>
  );
}

export default AterConnectionStatus;