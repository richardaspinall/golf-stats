import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

import { DEFAULT_MAP_CENTER, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '../lib/config';
import { distanceMetersBetween } from '../lib/geometry';
import { loadGoogleMapsScript } from '../lib/googleMaps';
import type { Course } from '../types';

type UseCourseMapArgs = {
  isMapOpen: boolean;
  selectedHole: number;
  activeCourseId: string;
  activeCourse?: Course;
  isInteractive?: boolean;
  setCourses?: Dispatch<SetStateAction<Course[]>>;
  setCourseSaveState?: Dispatch<SetStateAction<string>>;
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
  isMapOpen,
  selectedHole,
  activeCourseId,
  activeCourse,
  isInteractive = false,
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
  const selectedHoleRef = useRef(selectedHole);
  const mapInstanceRef = useRef<any>(null);
  const mapPlacementModeRef = useRef('idle');
  const teeMarkerRef = useRef<any>(null);
  const greenMarkerRef = useRef<any>(null);
  const distanceLineRef = useRef<any>(null);
  const distanceLabelRef = useRef<any>(null);
  const lastAutoHeadingRef = useRef<number | null>(null);
  const mapInteractiveRef = useRef(false);

  const teePosition = activeCourse?.markers?.[selectedHole]?.teePosition ?? null;
  const greenPosition = activeCourse?.markers?.[selectedHole]?.greenPosition ?? null;

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
    if (!isMapOpen) {
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
          if (!activeCourseId || !setCourses || !setCourseSaveState) {
            return;
          }

          if (mode === 'tee' || mode === 'green') {
            setCourses((prev) =>
              prev.map((course) =>
                course.id === activeCourseId
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
  }, [activeCourseId, isMapOpen, setCourseSaveState, setCourses]);

  useEffect(() => {
    if (isMapOpen) {
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
  }, [isMapOpen]);

  useEffect(() => {
    mapPlacementModeRef.current = mapPlacementMode;
  }, [mapPlacementMode]);

  useEffect(() => {
    selectedHoleRef.current = selectedHole;
  }, [selectedHole]);

  useEffect(() => {
    if (isMapOpen) {
      setMapViewportVersion((prev) => prev + 1);
    }
  }, [activeCourseId, isMapOpen, selectedHole]);

  useEffect(() => {
    lastAutoHeadingRef.current = null;
  }, [isMapOpen, selectedHole]);

  useEffect(() => {
    mapInteractiveRef.current = isMapOpen && isInteractive;
  }, [isInteractive, isMapOpen]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    const teeIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="12" fill="rgba(24, 72, 39, 0.88)" />
          <path d="M18 7 L24 15 H12 Z" fill="#ffffff" />
          <rect x="17" y="15" width="2" height="10" rx="1" fill="#ffffff" />
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(36, 36),
      anchor: new window.google.maps.Point(18, 18),
    };
    const greenIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="14" fill="rgba(255,255,255,0.15)" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="20" cy="20" r="9" fill="rgba(255,255,255,0.12)" stroke="#ffffff" stroke-width="2"/>
          <circle cx="20" cy="20" r="4" fill="#ffffff"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };

    if (teePosition) {
      if (!teeMarkerRef.current) {
        teeMarkerRef.current = new window.google.maps.Marker({
          map: mapInstanceRef.current,
          title: 'Tee marker',
          icon: teeIcon,
        });
      } else if (teeMarkerRef.current.getMap() !== mapInstanceRef.current) {
        teeMarkerRef.current.setMap(mapInstanceRef.current);
      }
      teeMarkerRef.current.setIcon(teeIcon);
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
          icon: greenIcon,
        });
      } else if (greenMarkerRef.current.getMap() !== mapInstanceRef.current) {
        greenMarkerRef.current.setMap(mapInstanceRef.current);
      }
      greenMarkerRef.current.setIcon(greenIcon);
      greenMarkerRef.current.setPosition(greenPosition);
    } else if (greenMarkerRef.current) {
      greenMarkerRef.current.setMap(null);
      greenMarkerRef.current = null;
    }

    if (teePosition && greenPosition) {
      const map = mapInstanceRef.current;
      if (map && typeof map.setHeading === 'function') {
        map.setHeading(0);
      }
      if (map && typeof map.setTilt === 'function') {
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
              hole: selectedHole,
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
            strokeColor: '#ffffff',
            strokeOpacity: 0.62,
            strokeWeight: 2,
          });
        } else if (distanceLineRef.current.getMap() !== mapInstanceRef.current) {
          distanceLineRef.current.setMap(mapInstanceRef.current);
        }
        distanceLineRef.current.setPath([teeLatLng, greenLatLng]);

        const distanceBadgePosition = geometry?.spherical?.interpolate
          ? geometry.spherical.interpolate(teeLatLng, greenLatLng, 0.5)
          : new window.google.maps.LatLng(
              (teePosition.lat + greenPosition.lat) / 2,
              (teePosition.lng + greenPosition.lng) / 2,
            );
        const distanceBadgeSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="21" fill="rgba(20, 34, 24, 0.58)"/>
            <text x="28" y="32" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#ffffff">${meters}m</text>
          </svg>
        `;
        if (!distanceLabelRef.current) {
          distanceLabelRef.current = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(distanceBadgeSvg)}`,
              scaledSize: new window.google.maps.Size(56, 56),
              anchor: new window.google.maps.Point(28, 28),
            },
          });
        } else if (distanceLabelRef.current.getMap() !== mapInstanceRef.current) {
          distanceLabelRef.current.setMap(mapInstanceRef.current);
        }
        distanceLabelRef.current.setIcon({
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(distanceBadgeSvg)}`,
          scaledSize: new window.google.maps.Size(56, 56),
          anchor: new window.google.maps.Point(28, 28),
        });
        distanceLabelRef.current.setPosition(distanceBadgePosition);
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
  }, [greenPosition, isMapOpen, mapRotationSupport, mapStatus, mapViewportVersion, selectedHole, teePosition]);

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
