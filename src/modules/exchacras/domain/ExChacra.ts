export interface ExChacra {
  id: string;
  numero: number;

  // GeoJSON almacenado en EPSG:4326.
  geometryGeoJson: string;

  source: "manual" | "imported";

  createdAt: string;
  updatedAt: string;
}