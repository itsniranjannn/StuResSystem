// Ranking algorithm: stable merge sort, O(n log n), then standard competition ranking (1, 2, 2, 4).
// Order: passed students first, then GPA desc, total marks desc, name asc.
function compare(a, b) {
  const pa = a.status === 'pass' ? 1 : 0;
  const pb = b.status === 'pass' ? 1 : 0;
  if (pa !== pb) return pb - pa;
  if (a.gpa !== b.gpa) return b.gpa - a.gpa;
  if (a.total_marks !== b.total_marks) return b.total_marks - a.total_marks;
  return String(a.name || '').localeCompare(String(b.name || ''));
}

function mergeSort(arr, cmp = compare) {
  if (arr.length <= 1) return arr.slice();
  const mid = arr.length >> 1;
  const l = mergeSort(arr.slice(0, mid), cmp);
  const r = mergeSort(arr.slice(mid), cmp);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < l.length && j < r.length) out.push(cmp(l[i], r[j]) <= 0 ? l[i++] : r[j++]);
  while (i < l.length) out.push(l[i++]);
  while (j < r.length) out.push(r[j++]);
  return out;
}

function rankStudents(rows) {
  const sorted = mergeSort(rows);
  let prev = null;
  let prevRank = 0;
  return sorted.map((row, idx) => {
    const tie = prev && row.status === prev.status && row.gpa === prev.gpa && row.total_marks === prev.total_marks;
    const rank = tie ? prevRank : idx + 1;
    prev = row;
    prevRank = rank;
    return { ...row, class_rank: row.status === 'incomplete' ? null : rank };
  });
}

module.exports = { compare, mergeSort, rankStudents };
