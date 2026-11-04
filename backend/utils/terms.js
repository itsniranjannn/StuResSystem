// Exam year of a cohort for a given term:  admission year + ceil(term / termsPerYear).
// e.g. BCA batch 2022, semester 8 (2 per year) -> 2026;  BBS batch 2023, year 3 -> 2026.
const examYear = (batch, term, termsPerYear = 1) => Number(batch) + Math.ceil(Number(term) / Number(termsPerYear));
const batchFor = (year, term, termsPerYear = 1) => Number(year) - Math.ceil(Number(term) / Number(termsPerYear));
module.exports = { examYear, batchFor };
