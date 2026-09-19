import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyListing } from '../types';

interface InteractiveMapProps {
  properties: PropertyListing[];
  selectedProperty: PropertyListing | null;
  onSelectProperty: (property: PropertyListing) => void;
  onOpenDetail?: (property: PropertyListing) => void;
  className?: string;
}

const CITY_COORDS: Record<string, [number, number]> = {
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  'delhi ncr': [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  chennai: [13.0827, 80.2707],
  pune: [18.5204, 73.8567],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
};

function getCoords(prop: PropertyListing, idx: number): [number, number] {
  if (prop.latitude && prop.longitude) {
    return [prop.latitude, prop.longitude];
  }
  const cityKey = prop.city.toLowerCase();
  const base = CITY_COORDS[cityKey] || [12.9716, 77.5946];
  // Add small deterministic offset so markers don't overlap exactly
  const latOffset = ((idx % 5) - 2) * 0.015 + ((idx * 7) % 11) * 0.003;
  const lngOffset = (((idx + 3) % 5) - 2) * 0.015 + ((idx * 13) % 11) * 0.003;
  return [base[0] + latOffset, base[1] + lngOffset];
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  properties,
  selectedProperty,
  onSelectProperty,
  onOpenDetail,
  className = 'h-full w-full',
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  // The map is created once; the property list only seeds its initial centre, and the marker
  // click handlers should always call the latest callbacks without re-creating every marker.
  const initialPropertiesRef = useRef(properties);
  const callbacksRef = useRef({ onSelectProperty, onOpenDetail });
  useEffect(() => {
    callbacksRef.current = { onSelectProperty, onOpenDetail };
  }, [onSelectProperty, onOpenDetail]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const properties = initialPropertiesRef.current;

    // Default center to Bengaluru or first property
    let defaultLat = 12.9716;
    let defaultLng = 77.5946;

    if (properties.length > 0) {
      const firstCoords = getCoords(properties[0], 0);
      defaultLat = firstCoords[0];
      defaultLng = firstCoords[1];
    }

    const map = L.map(containerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Clean modern Voyager light tile layer from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Fix map container size on render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers & Bounds when properties change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    (Object.values(markersRef.current) as L.Marker[]).forEach((marker) => marker.remove());
    markersRef.current = {};

    if (properties.length === 0) return;

    const bounds = L.latLngBounds([]);

    properties.forEach((prop, idx) => {
      const coords = getCoords(prop, idx);
      bounds.extend(coords);

      const isSelected = selectedProperty?.id === prop.id;
      const rentVal = prop.rent || prop.price || 10000;
      const priceTag = `₹${(rentVal / 1000).toFixed(1)}k`;

      const customIcon = L.divIcon({
        className: 'custom-property-marker',
        html: `
          <div style="transform: translate(-50%, -50%); cursor: pointer;">
            <div class="${
              isSelected
                ? 'bg-slate-900 text-white ring-4 ring-[#a3e635] scale-110 shadow-2xl z-50'
                : 'bg-[#a3e635] text-slate-950 hover:bg-[#88d900] shadow-md border border-slate-800/20 hover:scale-105 z-10'
            } px-3 py-1.5 rounded-full font-sans font-extrabold text-xs transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap">
              <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-[#a3e635]' : 'bg-slate-900'}"></span>
              <span>${priceTag}</span>
            </div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      // Popup html
      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 min-w-[200px] text-slate-900 font-sans';
      popupContent.innerHTML = `
        <div class="space-y-2">
          <img src="${prop.image}" alt="${prop.title}" class="w-full h-24 object-cover rounded-xl" />
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <h4 class="font-extrabold text-xs text-slate-900 truncate">${prop.title}</h4>
              <span class="text-amber-600 font-bold text-[11px] flex items-center">★ ${prop.rating}</span>
            </div>
            <p class="text-[10px] text-slate-500 truncate">${prop.address || `${prop.city}`}</p>
            <div class="flex items-center justify-between pt-1 border-t border-slate-100">
              <span class="font-black text-xs text-slate-900">₹${rentVal.toLocaleString('en-IN')}/mo</span>
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">View details</span>
            </div>
          </div>
        </div>
      `;

      popupContent.addEventListener('click', () => {
        callbacksRef.current.onSelectProperty(prop);
        callbacksRef.current.onOpenDetail?.(prop);
      });

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-leaflet-popup',
      });

      marker.on('click', () => {
        callbacksRef.current.onSelectProperty(prop);
      });

      markersRef.current[prop.id] = marker;
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [properties, selectedProperty]);

  // Center on selected property if changed
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProperty) return;

    const idx = properties.findIndex((p) => p.id === selectedProperty.id);
    const coords = getCoords(selectedProperty, idx >= 0 ? idx : 0);

    map.panTo(coords, { animate: true, duration: 0.8 });
    const selectedMarker = markersRef.current[selectedProperty.id];
    if (selectedMarker) {
      selectedMarker.openPopup();
    }
  }, [selectedProperty, properties]);

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[400px] z-0" />
      <style>{`
        .leaflet-container {
          font-family: inherit;
          z-index: 0 !important;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          padding: 4px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(226, 232, 240, 0.9);
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </div>
  );
};
