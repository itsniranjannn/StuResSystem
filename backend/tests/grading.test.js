const test = require('node:test');
const assert = require('node:assert');
const { evaluateSubject, computeSemester, gradeFor, divisionFor, cgpa } = require('../utils/grading');
const { rankStudents, mergeSort } = require('../utils/ranking');
const A = require('../utils/algorithms');

const sub = (i, e, credit = 3) => ({ internal_marks: i, external_marks: e, internal_full: 40, external_full: 60, credit });

test('grade boundaries per scheme (binary search over bands)', () => {
  assert.equal(gradeFor(90, 'tu_gpa').grade, 'A');
  assert.equal(gradeFor(89.99, 'tu_gpa').grade, 'A-');
  assert.equal(gradeFor(40, 'tu_gpa').grade, 'D');
  assert.equal(gradeFor(39.9, 'tu_gpa').grade, 'F');
  assert.equal(gradeFor(90, 'neb_gpa').grade, 'A+');
  assert.equal(gradeFor(34, 'neb_gpa').grade, 'NG');
  assert.equal(gradeFor(80, 'division').grade, 'Dist.');
  assert.equal(divisionFor(60), 'First Division');
  assert.equal(divisionFor(47.9), 'Pass Division');
});

test('external failure fails the subject even with high total', () => {
  const r = evaluateSubject(sub(40, 20));
  assert.equal(r.passed, false);
  assert.equal(r.grade, 'F');
});

test('NEB pass mark is configurable (35%)', () => {
  const r = evaluateSubject({ internal_marks: 10, external_marks: 27, internal_full: 25, external_full: 75, credit: 4 }, 'neb_gpa', 35);
  assert.equal(r.passed, true); // 37% overall, 36% external
  assert.equal(r.grade, 'D');
});

test('GPA weights by credit and division scheme uses 4.0 equivalent', () => {
  const r = computeSemester([sub(36, 54, 3), sub(24, 36, 1)]);
  assert.equal(r.gpa, 3.58);
  assert.equal(r.status, 'pass');
  const d = computeSemester([sub(36, 54), sub(24, 36)], 'division');
  assert.equal(d.division, 'First Division');
  assert.equal(d.gpa, 3);
});

test('CGPA is credit weighted', () => {
  assert.equal(cgpa([{ gpa: 4, total_credits: 3 }, { gpa: 2, total_credits: 1 }]), 3.5);
});

test('ranking uses competition ranking and puts failures last', () => {
  const rows = [
    { name: 'a', gpa: 3.5, total_marks: 400, status: 'pass' }, { name: 'b', gpa: 3.9, total_marks: 450, status: 'pass' },
    { name: 'c', gpa: 3.5, total_marks: 400, status: 'pass' }, { name: 'd', gpa: 3.95, total_marks: 480, status: 'fail' },
  ];
  assert.deepEqual(rankStudents(rows).map((r) => [r.name, r.class_rank]), [['b', 1], ['a', 2], ['c', 2], ['d', 4]]);
});

test('merge sort is stable and correct on random data', () => {
  const arr = Array.from({ length: 500 }, (_, i) => ({ v: (i * 7919) % 101, i }));
  const sorted = mergeSort(arr, (x, y) => x.v - y.v);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i - 1].v < sorted[i].v || (sorted[i - 1].v === sorted[i].v && sorted[i - 1].i < sorted[i].i));
  }
});

test('heap top-k matches full sort', () => {
  const data = Array.from({ length: 200 }, (_, i) => ({ s: (i * 37) % 97 }));
  const top = A.topK(data, 5, (x) => x.s).map((x) => x.s);
  assert.deepEqual(top, [...data].sort((a, b) => b.s - a.s).slice(0, 5).map((x) => x.s));
});

test('descriptive statistics', () => {
  const d = A.describe([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(d.mean, 5); assert.equal(d.std, 2); assert.equal(d.median, 4.5); assert.equal(d.mode, 4);
});

test('percentile rank by binary search', () => {
  assert.equal(A.percentileRank([10, 20, 30, 40, 50], 30), 50);
  assert.equal(A.percentileRank([10, 20, 30, 40, 50], 55), 100);
});

test('linear regression recovers a line and predicts', () => {
  const lr = A.linearRegression([[1, 3], [2, 5], [3, 7], [4, 9]]);
  assert.equal(lr.slope, 2); assert.equal(lr.intercept, 1); assert.equal(lr.r2, 1);
  assert.equal(lr.predict(5), 11);
});

test('pearson correlation', () => {
  assert.equal(A.pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1);
  assert.equal(A.pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1);
});

test('k-means separates two obvious groups', () => {
  const pts = [[1, 1], [1.2, 0.9], [0.9, 1.1], [9, 9], [9.1, 8.8], [8.9, 9.2]];
  const { labels } = A.kmeans(pts, 2);
  assert.equal(labels[0], labels[1]); assert.equal(labels[3], labels[4]); assert.notEqual(labels[0], labels[3]);
});

test('risk score explains itself', () => {
  const r = A.riskScore({ attendance: 60, gpaSlope: -0.4, lastGpa: 1.9, failedSubjects: 2, internalPct: 40 });
  assert.equal(r.level, 'high');
  assert.ok(r.reasons.length >= 4);
  assert.equal(A.riskScore({ attendance: 95, gpaSlope: 0.1, lastGpa: 3.5, failedSubjects: 0, internalPct: 80 }).level, 'low');
});
