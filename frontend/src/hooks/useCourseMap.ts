import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

import { DEFAULT_MAP_CENTER, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '../lib/config';
import { distanceMetersBetween } from '../lib/geometry';
import { loadGoogleMapsScript } from '../lib/googleMaps';
import type { Course } from '../types';

type UseCourseMapArgs = {
  page: string;
  isMapSetupOpen: boolean;
  mapSetupHole: number;
  courseEditorId: string;
  courseEditor?: Course;
  setCourses: Dispatch<SetStateAction<Course[]>>;
  setCourseSaveState: Dispatch<SetStateAction<string>>;
};

const MAP_STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  loading: 'Loading',
  locating: 'Locating',
  ready: 'Ready',
  error: 'Error',
  'missing-key': 'Missing key',
};

const MAP_PLACEMENT_LABELS: Record<string, string> = {
  idle: 'Click to place',
  tee: 'Placing tee',
  green: 'Placing green',
};

export function useCourseMap({
  page,
  isMapSetupOpen,
  mapSetupHole,
  courseEditorId,
  courseEditor,
  setCourses,
  setCourseSaveState,
}: UseCourseMapArgs) {
  const [mapStatus, setMapStatus] = useState('idle');
  const [mapPlacementMode, setMapPlacementMode] = useState('idle');
  const [mapRotationSupport, setMapRotationSupport] = useState('unknown');
  const [teeToGreenMeters, setTeeToGreenMeters] = useState<number | null>(null);
  const [mapViewportVersion, setMapViewportVersion] = useState(0);
  const [mapDebugInfo, setMapDebugInfo] = useState<any>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedHoleRef = useRef(mapSetupHole);
  const mapInstanceRef = useRef<any>(null);
  const mapPlacementModeRef = useRef('idle');
  const teeMarkerRef = useRef<any>(null);
  const greenMarkerRef = useRef<any>(null);
  const distanceLineRef = useRef<any>(null);
  const distanceLabelRef = useRef<any>(null);
  const lastAutoHeadingRef = useRef<number | null>(null);
  const mapInteractiveRef = useRef(false);

  const teePosition = courseEditor?.markers?.[mapSetupHole]?.teePosition ?? null;
  const greenPosition = courseEditor?.markers?.[mapSetupHole]?.greenPosition ?? null;

  const mapStatusLabel = MAP_STATUS_LABELS[mapStatus] || 'Idle';
  const mapPlacementLabel = MAP_PLACEMENT_LABELS[mapPlacementMode] || 'Click to place';
  const rotationSupportLabel =
    mapRotationSupport === 'supported'
      ? 'Rotation supported'
      : mapRotationSupport === 'unsupported'
        ? 'Rotation unsupported'
        : 'Rotation unknown';

  const resetMapState = () => {
    setMapStatus('idle');
    setMapPlacementMode('idle');
    setMapRotationSupport('unknown');
    setTeeToGreenMeters(null);
    setMapViewportVersion(0);
    setMapDebugInfo(null);
  };

  useEffect(() => {
    const shouldShowMap = page === 'courses' && isMapSetupOpen;
    if (!shouldShowMap) {
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      setMapStatus('missing-key');
      return;
    }

    if (!mapContainerRef.current) {
      return;
    }

    if (mapInstanceRef.current) {
      setMapStatus('ready');
      return;
    }

    let cancelled = false;
    setMapStatus('loading');

    loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
      .then((google) => {
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: 16,
          mapTypeId: 'satellite',
          mapId: GOOGLE_MAPS_MAP_ID || undefined,
          tilt: 0,
          rotateControl: true,
          disableDefaultUI: true,
          clickableIcons: false,
        });

        lastAutoHeadingRef.current = null;

        const enforceTiltZero = () => {
          const map = mapInstanceRef.current;
          if (!map || typeof map.getTilt !== 'function') {
            return;
          }
          if (map.getTilt() !== 0) {
            map.setTilt(0);
          }
        };

        enforceTiltZero();
        mapInstanceRef.current.addListener('tilt_changed', enforceTiltZero);
        mapInstanceRef.current.addListener('zoom_changed', enforceTiltZero);

        if (typeof mapInstanceRef.current.getMapCapabilities === 'function') {
          const caps = mapInstanceRef.current.getMapCapabilities();
          if (caps && typeof caps.isHeadingSupported === 'boolean') {
            setMapRotationSupport(caps.isHeadingSupported ? 'supported' : 'unsupported');
          }
        }

        mapInstanceRef.current.addListener('click', (event: any) => {
          if (!mapInteractiveRef.current || !event?.latLng) {
            return;
          }

          const mode = mapPlacementModeRef.current;
          const next = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          const hole = selectedHoleRef.current;
          if (!courseEditorId) {
            return;
          }

          if (mode === 'tee' || mode === 'green') {
            setCourses((prev) =>
              prev.map((course) =>
                course.id === courseEditorId
                  ? {
                      ...course,
                      markers: {
                        ...course.markers,
                        [hole]: {
                          ...(course.markers?.[hole] || {}),
                          ...(mode === 'tee' ? { teePosition: next } : { greenPosition: next }),
                        },
                      },
                    }
                  : course,
              ),
            );
            setCourseSaveState('unsaved');
            setMapPlacementMode('idle');
          }
        });

        setMapStatus('locating');
        if (!navigator.geolocation) {
          setMapStatus('error');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (cancelled || !mapInstanceRef.current) {
              return;
            }

            const current = { lat: position.coords.latitude, lng: position.coords.longitude };
            mapInstanceRef.current.setCenter(current);
            new google.maps.Marker({
              position: current,
              map: mapInstanceRef.current,
              title: 'Your location',
            });
            setMapStatus('ready');
          },
          () => {
            if (!cancelled) {
              setMapStatus('error');
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMapStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, isMapSetupOpen, courseEditorId, setCourseSaveState, setCourses]);

  useEffect(() => {
    const shouldShowMap = page === 'courses' && isMapSetupOpen;
    if (shouldShowMap) {
      return;
    }

    if (teeMarkerRef.current) {
      teeMarkerRef.current.setMap(null);
      teeMarkerRef.current = null;
    }
    if (greenMarkerRef.current) {
      greenMarkerRef.current.setMap(null);
      greenMarkerRef.current = null;
    }
    if (distanceLineRef.current) {
      distanceLineRef.current.setMap(null);
      distanceLineRef.current = null;
    }
    if (distanceLabelRef.current) {
      distanceLabelRef.current.setMap(null);
      distanceLabelRef.current = null;
    }
    mapInstanceRef.current = null;
    setMapStatus('idle');
  }, [page, isMapSetupOpen]);

  useEffect(() => {
    mapPlacementModeRef.current = mapPlacementMode;
  }, [mapPlacementMode]);

  useEffect(() => {
    selectedHoleRef.current = mapSetupHole;
  }, [mapSetupHole]);

  useEffect(() => {
    if (page === 'courses' && isMapSetupOpen) {
      setMapViewportVersion((prev) => prev + 1);
    }
  }, [page, isMapSetupOpen, mapSetupHole, courseEditorId]);

  useEffect(() => {
    lastAutoHeadingRef.current = null;
  }, [mapSetupHole, isMapSetupOpen]);

  useEffect(() => {
    mapInteractiveRef.current = page === 'courses' && isMapSetupOpen;
  }, [page, isMapSetupOpen]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    if (teePosition) {
      if (!teeMarkerRef.current) {
        teeMarkerRef.current = new window.google.maps.Marker({
          map: mapInstanceRef.current,
          title: 'Tee marker',
          label: { text: 'T', color: '#1b5e33', fontWeight: '700' },
        });
      } else if (teeMarkerRef.current.getMap() !== mapInstanceRef.current) {
        teeMarkerRef.current.setMap(mapInstanceRef.current);
      }
      teeMarkerRef.current.setPosition(teePosition);
    } else if (teeMarkerRef.current) {
      teeMarkerRef.current.setMap(null);
      teeMarkerRef.current = null;
    }

    if (greenPosition) {
      if (!greenMarkerRef.current) {
        greenMarkerRef.current = new window.google.maps.Marker({
          map: mapInstanceRef.current,
          title: 'Green marker',
          label: { text: 'G', color: '#1b5e33', fontWeight: '700' },
        });
      } else if (greenMarkerRef.current.getMap() !== mapInstanceRef.current) {
        greenMarkerRef.current.setMap(mapInstanceRef.current);
      }
      greenMarkerRef.current.setPosition(greenPosition);
    } else if (greenMarkerRef.current) {
      greenMarkerRef.current.setMap(null);
      greenMarkerRef.current = null;
    }

    if (teePosition && greenPosition) {
      const map = mapInstanceRef.current;
      if (map) {
        map.setHeading(0);
        map.setTilt(0);
      }

      const toRadians = (deg: number) => (deg * Math.PI) / 180;
      const toDegrees = (rad: number) => (rad * 180) / Math.PI;
      const lat1 = toRadians(teePosition.lat);
      const lat2 = toRadians(greenPosition.lat);
      const dLng = toRadians(greenPosition.lng - teePosition.lng);
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;

      const distanceMeters = distanceMetersBetween(teePosition, greenPosition);
      const basePadding = distanceMeters < 120 ? 60 : distanceMeters < 200 ? 80 : distanceMeters < 300 ? 90 : 120;
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(teePosition);
      bounds.extend(greenPosition);
      const fitPadding = { top: basePadding, bottom: basePadding + 20, left: basePadding, right: basePadding };

      const ensureFitBounds = (attempt = 0, padding = fitPadding, postHeading: number | null = null, source = 'base') => {
        const map = mapInstanceRef.current;
        if (!map) {
          return;
        }
        if (typeof postHeading === 'number') {
          map.setHeading(postHeading);
          map.setTilt(0);
        }
        map.fitBounds(bounds, padding);
        window.setTimeout(() => {
          if (typeof postHeading === 'number') {
            map.setHeading(postHeading);
            map.setTilt(0);
          }
          const nextMap = mapInstanceRef.current;
          const mapBounds = nextMap?.getBounds();
          if (mapBounds) {
            const ne = mapBounds.getNorthEast();
            const sw = mapBounds.getSouthWest();
            setMapDebugInfo({
              hole: mapSetupHole,
              tee: teePosition,
              green: greenPosition,
              bounds: { ne: { lat: ne.lat(), lng: ne.lng() }, sw: { lat: sw.lat(), lng: sw.lng() } },
              attempt,
              padding,
              source,
            });
          }
          if (mapBounds?.contains(teePosition) && mapBounds?.contains(greenPosition)) {
            return;
          }
          if (attempt < 2) {
            ensureFitBounds(attempt + 1, padding, postHeading, source);
          }
        }, 200);
      };

      const zoomOutUntilVisible = (attempt = 0) => {
        const nextMap = mapInstanceRef.current;
        if (!nextMap) {
          return;
        }
        const mapBounds = nextMap.getBounds();
        if (mapBounds?.contains(teePosition) && mapBounds?.contains(greenPosition)) {
          return;
        }
        if (attempt >= 3) {
          return;
        }
        const currentZoom = nextMap.getZoom();
        if (typeof currentZoom === 'number') {
          nextMap.setZoom(currentZoom - 1);
        }
        window.setTimeout(() => zoomOutUntilVisible(attempt + 1), 120);
      };

      if (lastAutoHeadingRef.current !== bearing) {
        lastAutoHeadingRef.current = bearing;
        window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
          ensureFitBounds(0, fitPadding, bearing, 'base');
          const extraPadding = {
            top: fitPadding.top + 40,
            bottom: fitPadding.bottom + 40,
            left: fitPadding.left + 40,
            right: fitPadding.right + 40,
          };
          window.setTimeout(() => {
            const map = mapInstanceRef.current;
            const mapBounds = map?.getBounds();
            if (map && !(mapBounds?.contains(teePosition) && mapBounds?.contains(greenPosition))) {
              ensureFitBounds(0, extraPadding, bearing, 'extra');
              window.setTimeout(() => zoomOutUntilVisible(0), 160);
            }
            const projection = map?.getProjection?.();
            const zoom = map?.getZoom?.();
            if (map && projection && typeof zoom === 'number') {
              const scale = Math.pow(2, zoom);
              const center = map.getCenter();
              if (center) {
                const greenPoint = projection.fromLatLngToPoint(new window.google.maps.LatLng(greenPosition));
                const centerPoint = projection.fromLatLngToPoint(center);
                const desiredScreenOffsetPx = 80;
                const currentOffsetPx = (greenPoint.y - centerPoint.y) * scale;
                if (currentOffsetPx < -desiredScreenOffsetPx) {
                  const deltaPx = -desiredScreenOffsetPx - currentOffsetPx;
                  const nextCenterPoint = new window.google.maps.Point(centerPoint.x, centerPoint.y + deltaPx / scale);
                  const nextCenter = projection.fromPointToLatLng(nextCenterPoint);
                  map.setCenter(nextCenter);
                }
              }
            }
          }, 150);
        });
      }

      const geometry = window.google.maps.geometry;
      if (geometry?.spherical?.computeDistanceBetween) {
        const teeLatLng = new window.google.maps.LatLng(teePosition);
        const greenLatLng = new window.google.maps.LatLng(greenPosition);
        const meters = Math.round(geometry.spherical.computeDistanceBetween(teeLatLng, greenLatLng));
        setTeeToGreenMeters(Number.isFinite(meters) ? meters : null);

        if (!distanceLineRef.current) {
          distanceLineRef.current = new window.google.maps.Polyline({
            map: mapInstanceRef.current,
            strokeColor: '#1b5e33',
            strokeOpacity: 0.9,
            strokeWeight: 3,
          });
        } else if (distanceLineRef.current.getMap() !== mapInstanceRef.current) {
          distanceLineRef.current.setMap(mapInstanceRef.current);
        }
        distanceLineRef.current.setPath([teeLatLng, greenLatLng]);

        const midpoint = { lat: (teePosition.lat + greenPosition.lat) / 2, lng: (teePosition.lng + greenPosition.lng) / 2 };
        if (!distanceLabelRef.current) {
          distanceLabelRef.current = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0, strokeOpacity: 0, fillOpacity: 0 },
            label: { text: `${meters} m`, color: '#1d3557', fontWeight: '700', fontSize: '13px' },
          });
        } else if (distanceLabelRef.current.getMap() !== mapInstanceRef.current) {
          distanceLabelRef.current.setMap(mapInstanceRef.current);
        }
        distanceLabelRef.current.setPosition(midpoint);
        distanceLabelRef.current.setLabel({ text: `${meters} m`, color: '#1d3557', fontWeight: '700', fontSize: '13px' });
      } else {
        setTeeToGreenMeters(null);
        if (distanceLineRef.current) {
          distanceLineRef.current.setMap(null);
          distanceLineRef.current = null;
        }
        if (distanceLabelRef.current) {
          distanceLabelRef.current.setMap(null);
          distanceLabelRef.current = null;
        }
      }
    } else {
      setTeeToGreenMeters(null);
      setMapDebugInfo(null);
      if (distanceLineRef.current) {
        distanceLineRef.current.setMap(null);
        distanceLineRef.current = null;
      }
      if (distanceLabelRef.current) {
        distanceLabelRef.current.setMap(null);
        distanceLabelRef.current = null;
      }
    }
  }, [teePosition, greenPosition, mapStatus, mapSetupHole, mapViewportVersion, mapRotationSupport, isMapSetupOpen]);

  return {
    mapContainerRef,
    selectedHoleRef,
    mapStatus,
    mapPlacementMode,
    setMapPlacementMode,
    teeToGreenMeters,
    setTeeToGreenMeters,
    mapDebugInfo,
    mapStatusLabel,
    mapPlacementLabel,
    rotationSupportLabel,
    resetMapState,
  };
}
