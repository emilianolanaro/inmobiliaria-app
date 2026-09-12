import { fetch } from "@tauri-apps/plugin-http";

import type { CadastreLayer } from "../domain/CadastreLayer";

const ATER_WFS_URL =
  "https://geoserver.ater.gob.ar/geoserver/sit_catastro/ows";

export interface BoundingBox {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
}

export async function fetchAterLayers(): Promise<CadastreLayer[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.1.0",
    request: "GetCapabilities",
  });

  const response = await fetch(
    `${ATER_WFS_URL}?${params.toString()}`,
    {
      method: "GET",
      connectTimeout: 10_000,
    },
  );

  if (!response.ok) {
    throw new Error(
      `ATER WFS respondió con HTTP ${response.status}`,
    );
  }

  const xmlText = await response.text();

  const xml = new DOMParser().parseFromString(
    xmlText,
    "application/xml",
  );

  const parserError =
    xml.getElementsByTagName("parsererror")[0];

  if (parserError) {
    throw new Error(
      "No se pudo interpretar la respuesta WFS de ATER",
    );
  }

  const featureTypes = Array.from(
    xml.getElementsByTagNameNS("*", "FeatureType"),
  );

  return featureTypes
    .map((featureType): CadastreLayer => {
      const name =
        featureType
          .getElementsByTagNameNS("*", "Name")[0]
          ?.textContent?.trim() ?? "";

      const title =
        featureType
          .getElementsByTagNameNS("*", "Title")[0]
          ?.textContent?.trim() ?? name;

      return {
        name,
        title,
      };
    })
    .filter((layer) => layer.name.length > 0);
}

export async function fetchAterFeatures(
  typeName: string,
  boundingBox: BoundingBox,
): Promise<Record<string, unknown>> {
  const bbox = [
    boundingBox.minLongitude,
    boundingBox.minLatitude,
    boundingBox.maxLongitude,
    boundingBox.maxLatitude,
    "EPSG:4326",
  ].join(",");

  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox,
    maxFeatures: "10000",
  });

  const response = await fetch(
    `${ATER_WFS_URL}?${params.toString()}`,
    {
      method: "GET",
      connectTimeout: 15_000,
    },
  );

  if (!response.ok) {
    throw new Error(
      `ATER GetFeature respondió con HTTP ${response.status}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}