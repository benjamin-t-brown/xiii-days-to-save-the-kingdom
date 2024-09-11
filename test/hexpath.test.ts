import { it, describe, expect } from 'vitest';
import { createAdjacentIterArrayHex, Point } from '../src/utils';
import { findPath } from '../src/path';

const strPath = (path: Point[]) => path.map((v) => v.join(','));

describe.only('HexPath', () => {
  describe('can create an adjacent hex iter array', () => {
    it('for base 0 0', () => {
      const arr = createAdjacentIterArrayHex([0, 0]).map((v) => v.join(','));
      const expected = [
        [-1, 0],
        [-1, -1],
        [0, 1],
        [1, 0],
        [0, 1],
        [-1, 1],
      ].map((v) => v.join(','));

      expect(arr.length).toEqual(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(arr.includes(expected[i])).toBeTruthy();
      }
    });
    it('for base even y', () => {
      const arr = createAdjacentIterArrayHex([2, 4]).map((v) => v.join(','));
      const expected = [
        [1, 4],
        [1, 3],
        [2, 3],
        [3, 4],
        [2, 5],
        [1, 5],
      ].map((v) => v.join(','));

      expect(arr.length).toEqual(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(arr.includes(expected[i])).toBeTruthy();
      }
    });

    it('for base odd y', () => {
      const arr = createAdjacentIterArrayHex([3, 5]).map((v) => v.join(','));
      const expected = [
        [2, 5],
        [3, 4],
        [4, 4],
        [4, 5],
        [4, 6],
        [3, 6],
      ].map((v) => v.join(','));

      expect(arr.length).toEqual(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(arr.includes(expected[i])).toBeTruthy();
      }
    });
  });

  describe.only('can find a path', () => {
    it('for a simple path', () => {
      const costMap = `
        1, 1, 1, 2,
          1, 5, 1, 3,
        4, 2, 1, 1,
      `
        .replace(/\s/g, '')
        .split(',')
        .map((v) => parseInt(v));
      const start: Point = [0, 0];
      const end: Point = [3, 0];
      const { path, cost } = findPath(costMap, 4, start, end);
      expect(cost).toEqual(4);
      expect(strPath(path)).toEqual(
        strPath([
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
        ])
      );
    });

    it('for a basic path', () => {
      const costMap = `
        1, 1, 1, 1,
          9, 7, 5, 1,
        1, 1, 1, 1,
      `
        .replace(/\s/g, '')
        .split(',')
        .map((v) => parseInt(v));
      const start: Point = [0, 0];
      const end: Point = [0, 2];
      const { path, cost } = findPath(costMap, 4, start, end);
      expect(cost).toEqual(8);
      expect(strPath(path)).toEqual(
        strPath([
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [3, 1],
          [3, 2],
          [2, 2],
          [1, 2],
          [0, 2],
        ])
      );
    });
  });
});
