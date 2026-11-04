// Algorithms used by Anka, implemented from scratch (no libraries) so each can be explained in a viva.
// Complexities are for n students unless noted.
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/* 1. Min-heap Top-K  O(n log k): keep the k best items while scanning once. */
class MinHeap {
  constructor(cmp) { this.a = []; this.cmp = cmp; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(v) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function topK(items, k, score) {
  const heap = new MinHeap((x, y) => score(x) - score(y));
  for (const it of items) {
    if (heap.size < k) heap.push(it);
    else if (score(it) > score(heap.peek())) { heap.pop(); heap.push(it); }
  }
  const out = [];
  while (heap.size) out.push(heap.pop());
  return out.reverse();
}

/* 2. Descriptive statistics  O(n log n) because of the sort for median / quartiles. */
function describe(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0 };
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const variance = v.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const q = (p) => {
    const pos = (n - 1) * p;
    const lo = Math.floor(pos);
    return v[lo] + (v[Math.min(lo + 1, n - 1)] - v[lo]) * (pos - lo);
  };
  const freq = new Map();
  v.forEach((x) => freq.set(x, (freq.get(x) || 0) + 1));
  let mode = v[0];
  let best = 0;
  freq.forEach((c, x) => { if (c > best) { best = c; mode = x; } });
  return { n, mean: round(mean), median: round(q(0.5)), mode, std: round(Math.sqrt(variance)), min: v[0], max: v[n - 1], q1: round(q(0.25)), q3: round(q(0.75)) };
}

/* 3. z-score and percentile rank (binary search over the sorted sample) O(log n) per query. */
const zScore = (x, mean, std) => (std ? round((x - mean) / std) : 0);
function percentileRank(sortedAsc, x) {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedAsc[mid] < x) lo = mid + 1; else hi = mid; }
  const below = lo;
  hi = sortedAsc.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedAsc[mid] <= x) lo = mid + 1; else hi = mid; }
  const equal = lo - below;
  return sortedAsc.length ? round(((below + 0.5 * equal) / sortedAsc.length) * 100, 1) : 0;
}

/* 4. Least-squares linear regression  O(n): y = a + b x, with R^2; used to predict the next GPA. */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((a, p) => a + p[0], 0);
  const sy = points.reduce((a, p) => a + p[1], 0);
  const sxx = points.reduce((a, p) => a + p[0] * p[0], 0);
  const sxy = points.reduce((a, p) => a + p[0] * p[1], 0);
  const den = n * sxx - sx * sx;
  if (!den) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  const meanY = sy / n;
  const ssTot = points.reduce((a, p) => a + (p[1] - meanY) ** 2, 0);
  const ssRes = points.reduce((a, p) => a + (p[1] - (intercept + slope * p[0])) ** 2, 0);
  return { slope: round(slope, 3), intercept: round(intercept, 3), r2: ssTot ? round(1 - ssRes / ssTot, 3) : 1, predict: (x) => intercept + slope * x };
}

/* 5. Pearson correlation  O(n): how strongly internal marks predict external marks. */
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  return dx && dy ? round(num / Math.sqrt(dx * dy), 3) : null;
}

/* 6. K-means clustering (Lloyd's algorithm, deterministic farthest-point seeding) O(n k iterations).
      Groups students by (GPA, attendance %) into performance bands. Features are min-max scaled. */
function kmeans(points, k = 3, maxIter = 50) {
  if (points.length < k) return { labels: points.map(() => 0), centroids: points.map((p) => p.slice()), iterations: 0 };
  const dims = points[0].length;
  const lo = Array.from({ length: dims }, (_, d) => Math.min(...points.map((p) => p[d])));
  const hi = Array.from({ length: dims }, (_, d) => Math.max(...points.map((p) => p[d])));
  const sc = points.map((p) => p.map((x, d) => (hi[d] === lo[d] ? 0 : (x - lo[d]) / (hi[d] - lo[d]))));
  const dist = (a, b) => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0);
  const cents = [sc.reduce((best, p, i) => (p[0] < sc[best][0] ? i : best), 0)].map((i) => sc[i].slice());
  while (cents.length < k) {
    let far = 0, farD = -1;
    sc.forEach((p, i) => { const d = Math.min(...cents.map((c) => dist(p, c))); if (d > farD) { farD = d; far = i; } });
    cents.push(sc[far].slice());
  }
  let labels = new Array(sc.length).fill(0);
  let it = 0;
  for (; it < maxIter; it++) {
    const next = sc.map((p) => cents.reduce((b, c, ci) => (dist(p, c) < dist(p, cents[b]) ? ci : b), 0));
    const changed = next.some((l, i) => l !== labels[i]);
    labels = next;
    cents.forEach((c, ci) => {
      const members = sc.filter((_, i) => labels[i] === ci);
      if (members.length) for (let d = 0; d < dims; d++) c[d] = members.reduce((s, m) => s + m[d], 0) / members.length;
    });
    if (!changed && it > 0) break;
  }
  const centroids = cents.map((c) => c.map((x, d) => round(lo[d] + x * (hi[d] - lo[d]))));
  return { labels, centroids, iterations: it + 1 };
}

/* 7. Early-warning risk score (transparent weighted rules, 0-100). Every point is explained to the user. */
function riskScore({ attendance, gpaSlope, lastGpa, failedSubjects, internalPct }) {
  const reasons = [];
  let score = 0;
  if (attendance != null && attendance < 80) {
    const pts = Math.min(35, Math.round((80 - attendance) * 1.2) + 10);
    score += pts; reasons.push({ points: pts, text: `Attendance ${attendance}% is below the 80% exam-eligibility requirement` });
  }
  if (failedSubjects > 0) { const pts = Math.min(30, failedSubjects * 12); score += pts; reasons.push({ points: pts, text: `${failedSubjects} failed subject(s) to clear` }); }
  if (gpaSlope != null && gpaSlope < -0.1) { const pts = Math.min(20, Math.round(-gpaSlope * 40)); score += pts; reasons.push({ points: pts, text: 'GPA is trending downward over recent terms' }); }
  if (lastGpa != null && lastGpa < 2.2) { score += 10; reasons.push({ points: 10, text: `Latest GPA ${lastGpa} is low` }); }
  if (internalPct != null && internalPct < 50) { score += 10; reasons.push({ points: 10, text: `Internal assessment average ${internalPct}% is weak` }); }
  score = Math.min(100, score);
  return { score, level: score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low', reasons };
}

/* 8. Attendance eligibility. */
const attendancePercent = (present, late, total) => (total ? round(((present + late * 0.5) / total) * 100, 1) : null);

module.exports = { MinHeap, topK, describe, zScore, percentileRank, linearRegression, pearson, kmeans, riskScore, attendancePercent, round };
