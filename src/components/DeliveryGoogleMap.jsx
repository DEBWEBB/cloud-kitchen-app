import { useEffect, useMemo, useRef } from "react";
import {
  GoogleMap,
  MarkerF,
  PolylineF,
  useJsApiLoader,
} from "@react-google-maps/api";

const mapLibraries = [];
const defaultCenter = { lat: 22.5726, lng: 88.3639 };

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  fullscreenControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  clickableIcons: false,
  gestureHandling: "greedy",
  styles: [
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      stylers: [{ visibility: "off" }],
    },
  ],
};

const makeMarkerIcon = (fillColor) => {
  if (!globalThis.google?.maps) return undefined;

  return {
    path: globalThis.google.maps.SymbolPath.CIRCLE,
    fillColor,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 3,
    scale: 10,
  };
};

const normalizePoint = (point) =>
  point && typeof point.lat === "number" && typeof point.lng === "number"
    ? { lat: point.lat, lng: point.lng }
    : null;

export default function DeliveryGoogleMap({
  center,
  customerLocation,
  courierLocation,
  routePath = [],
  customerLabel = "Customer location",
  courierLabel = "Courier location",
  zoom = 15,
}) {
  const mapRef = useRef(null);
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_KEY ||
    "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "delivery-google-map",
    googleMapsApiKey: apiKey,
    libraries: mapLibraries,
  });

  const normalizedCenter = normalizePoint(center) || defaultCenter;
  const normalizedCustomer = normalizePoint(customerLocation);
  const normalizedCourier = normalizePoint(courierLocation);
  const normalizedPath = useMemo(
    () =>
      Array.isArray(routePath)
        ? routePath
            .map((point) =>
              Array.isArray(point)
                ? { lat: point[0], lng: point[1] }
                : normalizePoint(point)
            )
            .filter(Boolean)
        : [],
    [routePath]
  );

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !globalThis.google?.maps) return;

    const map = mapRef.current;
    const bounds = new globalThis.google.maps.LatLngBounds();
    let hasBounds = false;

    [normalizedCustomer, normalizedCourier, ...normalizedPath].forEach((point) => {
      if (!point) return;
      bounds.extend(point);
      hasBounds = true;
    });

    if (hasBounds) {
      map.fitBounds(bounds, 64);
      return;
    }

    map.setCenter(normalizedCenter);
    map.setZoom(zoom);
  }, [
    isLoaded,
    normalizedCenter,
    normalizedCourier,
    normalizedCustomer,
    normalizedPath,
    zoom,
  ]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-orange-50 p-6 text-center dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="max-w-sm rounded-[28px] border border-dashed border-gray-300 bg-white/80 p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/80">
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            Google Maps API key is missing
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your frontend env file
            to enable the live delivery map.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 text-center dark:from-red-950/20 dark:via-gray-950 dark:to-gray-900">
        <div className="max-w-sm rounded-[28px] border border-red-200 bg-white/85 p-6 shadow-sm dark:border-red-900/40 dark:bg-gray-900/85">
          <p className="text-base font-semibold text-red-600 dark:text-red-300">
            Google Maps could not load
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Please check the API key, referrer restrictions, and internet
            connection.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-orange-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm dark:border-white/10 dark:bg-gray-900/80 dark:text-gray-300">
          Loading Google Maps...
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={normalizedCenter}
      zoom={zoom}
      options={mapOptions}
      onLoad={(map) => {
        mapRef.current = map;
      }}
    >
      {normalizedCustomer ? (
        <MarkerF
          position={normalizedCustomer}
          icon={makeMarkerIcon("#0f172a")}
          title={customerLabel}
        />
      ) : null}

      {normalizedCourier ? (
        <MarkerF
          position={normalizedCourier}
          icon={makeMarkerIcon("#ec4899")}
          title={courierLabel}
        />
      ) : null}

      {normalizedPath.length >= 2 ? (
        <PolylineF
          path={normalizedPath}
          options={{
            strokeColor: "#f97316",
            strokeOpacity: 0.92,
            strokeWeight: 5,
            geodesic: true,
          }}
        />
      ) : null}
    </GoogleMap>
  );
}
