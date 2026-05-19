'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [10.7312, 122.5649];

const pinIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
    },
  });
  return null;
}

function MapSyncer({
  latitude,
  longitude,
}: {
  latitude?: number;
  longitude?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (
      latitude != null &&
      longitude != null &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
    }
  }, [latitude, longitude, map]);
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
}: LocationPickerProps) {
  const hasPin =
    latitude != null &&
    longitude != null &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  return (
    <div className="location-picker relative h-full w-full">
      <style>
        {
          '.location-picker .leaflet-container { cursor: crosshair !important; }'
        }
      </style>

      <MapContainer
        center={hasPin ? [latitude, longitude] : DEFAULT_CENTER}
        zoom={hasPin ? 16 : 13}
        style={{ height: '100%', width: '100%' }}
        className="rounded-md"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onLocationSelect={onLocationSelect} />
        <MapSyncer latitude={latitude} longitude={longitude} />
        {hasPin && (
          <Marker
            position={[latitude, longitude]}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng();
                onLocationSelect(
                  parseFloat(lat.toFixed(6)),
                  parseFloat(lng.toFixed(6)),
                );
              },
            }}
          />
        )}
      </MapContainer>

      {!hasPin && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[1000] flex justify-center">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
            Click anywhere to pin your location
          </span>
        </div>
      )}
    </div>
  );
}
