import type { Dispatch, RefObject, SetStateAction } from 'react';

import { SavePill } from '../SavePill';
import { HOLE_INDEX_OPTIONS, HOLES } from '../../lib/constants';

const PAR_OPTIONS = [3, 4, 5, 6];
import type { Course } from '../../types';

type CoursesPageProps = {
  state: {
    newCourseName: string;
    isLoadingCourses: boolean;
    coursesError: string;
    courses: Course[];
    courseEditorId: string;
    courseEditor?: Course;
    courseSaveState: string;
    courseHoleIndexCounts: Record<number, number>;
    isMapSetupOpen: boolean;
    mapSetupHole: number;
    teeToGreenMeters: number | null;
    mapStatus: string;
    mapStatusLabel: string;
    rotationSupportLabel: string;
    mapPlacementLabel: string;
    mapPlacementMode: string;
    mapDebugInfo: unknown;
  };
  actions: {
    setNewCourseName: (value: string) => void;
    createCourse: () => void;
    setCourseEditorId: (value: string) => void;
    setIsMapSetupOpen: (value: boolean) => void;
    setMapPlacementMode: (value: string) => void;
    setMapSetupHole: (value: number) => void;
    setCourseSaveState: (value: string) => void;
    setCourses: Dispatch<SetStateAction<Course[]>>;
    saveCurrentCourse: () => void;
    setTeeToGreenMeters: (value: number | null) => void;
  };
  map: {
    googleMapsMapId: string;
    googleMapsApiKey: string;
    selectedHoleRef: RefObject<number>;
    mapContainerRef: RefObject<HTMLDivElement | null>;
  };
};

type CourseListPanelProps = Pick<CoursesPageProps, 'state' | 'actions'>;
type CourseEditorPanelProps = Pick<CoursesPageProps, 'state' | 'actions'>;
type CourseMapCardProps = Pick<CoursesPageProps, 'state' | 'actions' | 'map'>;

function CourseListPanel({ state, actions }: CourseListPanelProps) {
  const { newCourseName, isLoadingCourses, coursesError, courses, courseEditorId } = state;
  const {
    setNewCourseName,
    createCourse,
    setCourseEditorId,
    setIsMapSetupOpen,
    setMapPlacementMode,
    setMapSetupHole,
    setCourseSaveState,
  } = actions;

  return (
    <section className="card" aria-label="course list">
      <h3 className="section-title">Course list</h3>
      <div className="course-form">
        <input
          type="text"
          value={newCourseName}
          onChange={(event) => setNewCourseName(event.target.value)}
          placeholder="New course name"
          maxLength={80}
        />
        <button type="button" onClick={createCourse} disabled={!newCourseName.trim() || isLoadingCourses}>
          Create course
        </button>
      </div>
      {coursesError ? <p className="hint">{coursesError}</p> : null}
      <div className="course-list">
        {courses.length === 0 ? (
          <p className="hint">No courses yet.</p>
        ) : (
          courses.map((course) => (
            <button
              key={course.id}
              type="button"
              className={courseEditorId === course.id ? 'course-btn active' : 'course-btn'}
              onClick={() => {
                setCourseEditorId(course.id);
                setIsMapSetupOpen(false);
                setMapPlacementMode('idle');
                setMapSetupHole(1);
                setCourseSaveState('saved');
              }}
            >
              {course.name}
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function CourseEditorPanel({ state, actions }: CourseEditorPanelProps) {
  const { courseEditor, courseSaveState, courseHoleIndexCounts, isMapSetupOpen, mapSetupHole } = state;
  const { setCourses, setCourseSaveState, saveCurrentCourse, setMapSetupHole, setIsMapSetupOpen } = actions;

  return (
    <section className="card" aria-label="course editor">
      <div className="map-header">
        <h3 className="section-title">Course details</h3>
        <SavePill state={courseSaveState} />
      </div>
      {!courseEditor ? (
        <p className="hint">Select a course to edit markers.</p>
      ) : (
        <>
          <label className="course-name-field">
            Course name
            <input
              type="text"
              value={courseEditor.name}
              onChange={(event) => {
                const nextName = event.target.value;
                setCourses((prev) => prev.map((entry) => (entry.id === courseEditor.id ? { ...entry, name: nextName } : entry)));
                setCourseSaveState('unsaved');
              }}
            />
          </label>
          <div className="manual-save-row">
            <button type="button" onClick={saveCurrentCourse} disabled={courseSaveState === 'saving'}>
              {courseSaveState === 'saving' ? 'Saving...' : 'Save course'}
            </button>
          </div>
          <div className="course-setup-list">
            {HOLES.map((hole) => {
              const holeMarkers = courseEditor.markers?.[hole];
              const indexValue = holeMarkers?.holeIndex ?? hole;
              const isDuplicate = (courseHoleIndexCounts[indexValue] || 0) > 1;
              return (
                <div key={hole} className="course-setup-row">
                  <strong>Hole {hole}</strong>
                  <label className="course-index-field">
                    Index
                    <select
                      value={indexValue}
                      onChange={(event) => {
                        const nextValue = Math.min(18, Math.max(1, Math.floor(Number(event.target.value))));
                        setCourses((prev) =>
                          prev.map((entry) =>
                            entry.id === courseEditor.id
                              ? {
                                  ...entry,
                                  markers: {
                                    ...entry.markers,
                                    [hole]: {
                                      ...(entry.markers?.[hole] || {}),
                                      holeIndex: nextValue,
                                    },
                                  },
                                }
                              : entry,
                          ),
                        );
                        setCourseSaveState('unsaved');
                      }}
                    >
                      {HOLE_INDEX_OPTIONS.map((indexOption) => (
                        <option key={indexOption} value={indexOption}>
                          {indexOption}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="course-index-field">
                    Par
                    <select
                      value={holeMarkers?.par ?? 4}
                      onChange={(event) => {
                        const nextValue = Math.min(6, Math.max(3, Math.floor(Number(event.target.value))));
                        setCourses((prev) =>
                          prev.map((entry) =>
                            entry.id === courseEditor.id
                              ? {
                                  ...entry,
                                  markers: {
                                    ...entry.markers,
                                    [hole]: {
                                      ...(entry.markers?.[hole] || {}),
                                      par: nextValue,
                                    },
                                  },
                                }
                              : entry,
                          ),
                        );
                        setCourseSaveState('unsaved');
                      }}
                    >
                      {PAR_OPTIONS.map((parOption) => (
                        <option key={parOption} value={parOption}>
                          {parOption}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="course-index-field">
                    Distance (m)
                    <input
                      type="number"
                      min={1}
                      max={999}
                      step={1}
                      value={holeMarkers?.distanceMeters ?? ''}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        const nextValue =
                          rawValue === ''
                            ? null
                            : Math.min(999, Math.max(1, Math.floor(Number(rawValue))));
                        setCourses((prev) =>
                          prev.map((entry) =>
                            entry.id === courseEditor.id
                              ? {
                                  ...entry,
                                  markers: {
                                    ...entry.markers,
                                    [hole]: {
                                      ...(entry.markers?.[hole] || {}),
                                      distanceMeters: nextValue,
                                    },
                                  },
                                }
                              : entry,
                          ),
                        );
                        setCourseSaveState('unsaved');
                      }}
                      placeholder="e.g. 142"
                    />
                  </label>
                  <span className={isDuplicate ? 'course-index-warning' : 'course-index-ok'}>
                    {isDuplicate ? 'Duplicate index' : 'OK'}
                  </span>
                  <span className="course-marker-status">
                    {holeMarkers?.distanceMeters ? `Distance ${holeMarkers.distanceMeters}m` : 'Distance —'}
                  </span>
                  <span className="course-marker-status">{holeMarkers?.teePosition ? 'Tee ✓' : 'Tee —'}</span>
                  <span className="course-marker-status">{holeMarkers?.greenPosition ? 'Green ✓' : 'Green —'}</span>
                  <button
                    type="button"
                    className={isMapSetupOpen && mapSetupHole === hole ? 'active' : ''}
                    onClick={() => {
                      setMapSetupHole(hole);
                      setIsMapSetupOpen(true);
                    }}
                  >
                    {isMapSetupOpen && mapSetupHole === hole ? 'Editing map' : 'Set map'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function CourseMapCard({ state, actions, map }: CourseMapCardProps) {
  const {
    courseEditor,
    isMapSetupOpen,
    mapSetupHole,
    mapStatus,
    mapPlacementMode,
    teeToGreenMeters,
    mapPlacementLabel,
  } = state;
  const { setMapPlacementMode, setCourses, setCourseSaveState, setTeeToGreenMeters, setIsMapSetupOpen } = actions;
  const { selectedHoleRef, mapContainerRef } = map;

  return (
    <section className="card" aria-label="course map">
      <div className="map-header">
        <div>
          <h3 className="section-title">Hole map</h3>
        </div>
        <div className="map-controls">
          {isMapSetupOpen ? (
            <button type="button" className="icon-close-btn" aria-label="Close map" onClick={() => setIsMapSetupOpen(false)}>
              ×
            </button>
          ) : null}
          <button
            type="button"
            className={mapPlacementMode === 'tee' ? 'active' : ''}
            onClick={() => setMapPlacementMode(mapPlacementMode === 'tee' ? 'idle' : 'tee')}
            disabled={!courseEditor || !isMapSetupOpen || mapStatus !== 'ready'}
          >
            {mapPlacementMode === 'tee' ? 'Cancel tee' : 'Place tee'}
          </button>
          <button
            type="button"
            className={mapPlacementMode === 'green' ? 'active' : ''}
            onClick={() => setMapPlacementMode(mapPlacementMode === 'green' ? 'idle' : 'green')}
            disabled={!courseEditor || !isMapSetupOpen || mapStatus !== 'ready'}
          >
            {mapPlacementMode === 'green' ? 'Cancel green' : 'Place green'}
          </button>
          <button
            type="button"
            className="reset-btn"
            onClick={() => {
              if (!courseEditor) {
                return;
              }
              selectedHoleRef.current = mapSetupHole;
              setCourses((prev) =>
                prev.map((entry) =>
                  entry.id === courseEditor.id
                    ? {
                        ...entry,
                        markers: {
                          ...entry.markers,
                          [mapSetupHole]: {
                            ...(entry.markers?.[mapSetupHole] || {}),
                            teePosition: null,
                            greenPosition: null,
                          },
                        },
                      }
                    : entry,
                ),
              );
              setCourseSaveState('unsaved');
              setTeeToGreenMeters(null);
            }}
            disabled={!courseEditor || !isMapSetupOpen}
          >
            Clear hole
          </button>
        </div>
      </div>
      {!courseEditor ? <p className="hint">Select a course first.</p> : null}
      {courseEditor && !isMapSetupOpen ? <p className="hint">Choose a hole in Course details to place markers.</p> : null}
      {courseEditor && isMapSetupOpen ? (
        <>
          <p className="hint">Hole {mapSetupHole} | Mode: {mapPlacementLabel}</p>
          <p className="hint">
            Saved distance: {courseEditor.markers?.[mapSetupHole]?.distanceMeters ? `${courseEditor.markers[mapSetupHole].distanceMeters}m` : '—'}
          </p>
          <div className="map-shell">
            <div ref={mapContainerRef} className="map-canvas" />
          </div>
        </>
      ) : null}
    </section>
  );
}

export function CoursesPage(props: CoursesPageProps) {
  return (
    <div className="courses-grid">
      <CourseListPanel state={props.state} actions={props.actions} />
      <CourseEditorPanel state={props.state} actions={props.actions} />
      <CourseMapCard state={props.state} actions={props.actions} map={props.map} />
    </div>
  );
}
