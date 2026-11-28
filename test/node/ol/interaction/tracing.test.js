import {assert} from 'chai';
import {getTraceTargetUpdate} from '../../../../src/ol/interaction/tracing.js';

/**
 * Create a mock map where pixel and coordinate are identical (identity
 * transform).
 * @return {Object} A map-shaped object.
 */
function mockMap() {
  return {
    getPixelFromCoordinate(coord) {
      return [coord[0], coord[1]];
    },
  };
}

/**
 * Build a minimal square ring and trace state.
 *
 *   (0,0)---(100,0)
 *     |        |
 *   (0,100)-(100,100)
 *
 * Ring coordinates:
 *   0: (0,0)  1: (100,0)  2: (100,100)  3: (0,100)  4: (0,0) (closing)
 *
 * @param {number} startIndex Where tracing began.
 * @param {number} endIndex Current trace end position.
 * @param {import("../../../../src/ol/coordinate.js").Coordinate} startCoord
 * @return {{traceState: Object, map: Object}}
 */
function buildSquareTrace(startIndex, endIndex, startCoord) {
  const coordinates = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
    [0, 0],
  ];
  const target = {
    coordinates,
    ring: true,
    startIndex,
    endIndex,
  };
  return {
    traceState: {
      active: true,
      startCoord,
      targets: [target],
      targetIndex: 0,
    },
    map: mockMap(),
  };
}

describe('ol/interaction/tracing.js', () => {
  describe('getTraceTargetUpdate – direction near start', () => {
    const snapTolerance = 10;

    it('reverses direction when the step crosses the start', () => {
      // Tracing forward from start at (0,0), previous position is very close
      // to start (index 0.02 ≈ (2,0)).  The pointer jumps to (0,80) on the
      // left edge.  The segment from (2,0) to (0,80) passes about 2px from
      // (0,0), well within snap tolerance, so direction reversal is considered.
      // The reverse path (around 1 edge) is shorter than forward (around 3).
      const {traceState, map} = buildSquareTrace(0, 0.02, [0, 0]);

      const result = getTraceTargetUpdate([0, 80], traceState, map, snapTolerance);

      assert.isBelow(result.endIndex, 0, 'should choose reverse direction');
    });

    it('keeps forward direction when the step does not cross the start', () => {
      // Tracing forward from (0,0), currently at index 0.5 (50,0).  The
      // pointer moves further forward to (90,0).  The step segment stays
      // far from start.
      const {traceState, map} = buildSquareTrace(0, 0.5, [0, 0]);

      const result = getTraceTargetUpdate([90, 0], traceState, map, snapTolerance);

      assert.isAbove(result.endIndex, 0, 'should keep forward direction');
    });

    it('keeps direction when the pointer is far from the start on both ends', () => {
      // Tracing forward from (0,0), currently at index 1 (100,0).  Pointer
      // moves to (100,50) on the right edge.  The step from (100,0) to
      // (100,50) is 100px from (0,0).
      const {traceState, map} = buildSquareTrace(0, 1, [0, 0]);

      const result = getTraceTargetUpdate([100, 50], traceState, map, snapTolerance);

      assert.isAbove(result.endIndex, 1, 'should stay forward past index 1');
    });

    it('considers both directions on the very first move', () => {
      // Tracing just started at (0,0): endIndex = startIndex = 0.  Pointer
      // moves to (0,30) on the left edge.  Step starts at the start
      // coordinate itself, so both directions must be considered.
      const {traceState, map} = buildSquareTrace(0, 0, [0, 0]);

      const result = getTraceTargetUpdate([0, 30], traceState, map, snapTolerance);

      assert.isBelow(result.endIndex, 0, 'should choose reverse for first move left');
    });
  });
});
