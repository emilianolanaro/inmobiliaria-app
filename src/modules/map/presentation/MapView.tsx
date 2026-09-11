import { useEffect, useRef } from "react";

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";

import { useMapStore } from "../application/useMapStore";

import "ol/ol.css";
import "./MapView.css";

const CHAJARI_COORDINATES = [-57.98, -30.75];

function MapView() {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const baseLayerRef = useRef<TileLayer<OSM> | null>(null);

  const baseMapVisible = useMapStore(
    (state) => state.baseMapVisible,
  );

  useEffect(() => {
    if (!mapElement.current) {
      return;
    }

    const baseLayer = new TileLayer({
      source: new OSM(),
      visible: baseMapVisible,
    });

    baseLayerRef.current = baseLayer;

    const map = new Map({
      target: mapElement.current,

      layers: [baseLayer],

      view: new View({
        center: fromLonLat(CHAJARI_COORDINATES),
        zoom: 14,
      }),
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);

      mapRef.current = null;
      baseLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    baseLayerRef.current?.setVisible(baseMapVisible);
  }, [baseMapVisible]);

  return <div ref={mapElement} className="map" />;
}

export default MapView;