#!/usr/bin/env python3
"""Detect questions that share similar text across different exam types.

By default we report exact matches and near-duplicates (using fuzzy matching)
that appear under more than one `exam_type`, so we can regenerate fresh content
per exam type.
"""

from __future__ import annotations

import argparse
import collections
import sys
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from question_audit.db import dump_json, fetch_questions, get_supabase_client
from question_audit.text_utils import normalize_text, preview, token_signature


@dataclass
class QuestionRow:
    id: str
    exam_type: str
    category: str
    test_type: str
    difficulty: str
    question_text: str
    normalized_text: str
    signature: str


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))
        self.rank = [0] * size

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, a: int, b: int) -> bool:
        root_a = self.find(a)
        root_b = self.find(b)
        if root_a == root_b:
            return False
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        default="diagnostics_output",
        help="Directory where JSON reports will be written (default: diagnostics_output)",
    )
    parser.add_argument(
        "--min-count",
        type=int,
        default=2,
        help="Minimum number of rows that must share similar text to be reported (default: 2)",
    )
    parser.add_argument(
        "--similarity-threshold",
        type=float,
        default=0.9,
        help="Fuzzy similarity threshold (0-1) for linking near-duplicate question_text values (default: 0.90)",
    )
    parser.add_argument(
        "--max-pairs-per-cluster",
        type=int,
        default=5,
        help="How many representative cross-exam pairs to record per cluster (default: 5)",
    )
    parser.add_argument(
        "--include-intra-exam",
        action="store_true",
        help="Include clusters where duplicates occur within the same exam_type (useful for category-level cleanup)",
    )
    return parser.parse_args()


def load_questions() -> List[QuestionRow]:
    client = get_supabase_client()
    raw_rows = fetch_questions(
        client,
        columns=[
            "id",
            "question_text",
            "exam_type",
            "category",
            "test_type",
            "difficulty",
            "created_at",
        ],
    )

    rows: List[QuestionRow] = []
    for row in raw_rows:
        question_text = row.get("question_text") or ""
        normalized = normalize_text(question_text)  # lowercased, accent-folded
        rows.append(
            QuestionRow(
                id=str(row.get("id")),
                exam_type=row.get("exam_type") or "UNKNOWN",
                category=row.get("category") or "UNKNOWN",
                test_type=row.get("test_type") or "UNKNOWN",
                difficulty=row.get("difficulty") or "UNKNOWN",
                question_text=question_text,
                normalized_text=normalized,
                signature=token_signature(question_text),
            )
        )
    return rows


def _candidate_key(row: QuestionRow) -> str:
    tokens = row.signature.split()
    return " ".join(tokens[:5])


def _build_exact_groups(rows: Iterable[QuestionRow]) -> Dict[str, List[int]]:
    groups: Dict[str, List[int]] = collections.defaultdict(list)
    for idx, row in enumerate(rows):
        groups[row.normalized_text].append(idx)
    return groups


def _build_fuzzy_buckets(rows: Iterable[QuestionRow]) -> Dict[str, List[int]]:
    buckets: Dict[str, List[int]] = collections.defaultdict(list)
    for idx, row in enumerate(rows):
        buckets[_candidate_key(row)].append(idx)
    return buckets


def _link_exact_duplicates(uf: UnionFind, groups: Dict[str, List[int]], rows: List[QuestionRow]) -> None:
    for indices in groups.values():
        if len(indices) < 2:
            continue
        exam_types = {rows[idx].exam_type for idx in indices}
        if len(exam_types) <= 1:
            continue
        root = indices[0]
        for idx in indices[1:]:
            uf.union(root, idx)


def _link_fuzzy_duplicates(
    uf: UnionFind,
    buckets: Dict[str, List[int]],
    rows: List[QuestionRow],
    similarity_threshold: float,
) -> None:
    for indices in buckets.values():
        if len(indices) < 2:
            continue
        for i in range(len(indices)):
            idx_a = indices[i]
            row_a = rows[idx_a]
            for j in range(i + 1, len(indices)):
                idx_b = indices[j]
                row_b = rows[idx_b]
                if row_a.exam_type == row_b.exam_type:
                    continue
                ratio = SequenceMatcher(None, row_a.normalized_text, row_b.normalized_text).ratio()
                if ratio >= similarity_threshold:
                    uf.union(idx_a, idx_b)


def _collect_clusters(
    uf: UnionFind,
    rows: List[QuestionRow],
    min_count: int,
    max_pairs: int,
    include_intra_exam: bool,
) -> Dict[str, object]:
    clusters: Dict[int, List[int]] = collections.defaultdict(list)
    for idx in range(len(rows)):
        root = uf.find(idx)
        clusters[root].append(idx)

    cross_duplicates: List[Dict[str, object]] = []
    same_duplicates: List[Dict[str, object]] = []
    summary_counter_cross = collections.Counter()
    summary_counter_same = collections.Counter()

    for indices in clusters.values():
        if len(indices) < min_count:
            continue
        exam_types = {rows[idx].exam_type for idx in indices}
        records = [rows[idx] for idx in indices]

        if len(exam_types) <= 1:
            if not include_intra_exam:
                continue
            same_duplicates.append(
                {
                    "cluster_size": len(indices),
                    "question_preview": preview(records[0].question_text),
                    "category": records[0].category,
                    "exam_types": sorted(exam_types),
                    "counts_by_exam_type": dict(collections.Counter(rec.exam_type for rec in records)),
                    "records": [
                        {
                            "id": rec.id,
                            "exam_type": rec.exam_type,
                            "category": rec.category,
                            "test_type": rec.test_type,
                            "difficulty": rec.difficulty,
                            "question_text": rec.question_text,
                        }
                        for rec in records
                    ],
                }
            )
            for rec in records:
                summary_counter_same[rec.exam_type] += 1
            continue

        pair_details, min_sim, max_sim = _representative_pairs(records, max_pairs)
        cross_duplicates.append(
            {
                "cluster_size": len(indices),
                "question_preview": preview(records[0].question_text),
                "category": records[0].category,
                "exam_types": sorted(exam_types),
                "counts_by_exam_type": dict(collections.Counter(rec.exam_type for rec in records)),
                "min_similarity": round(min_sim, 3),
                "max_similarity": round(max_sim, 3),
                "representative_pairs": pair_details,
                "records": [
                    {
                        "id": rec.id,
                        "exam_type": rec.exam_type,
                        "category": rec.category,
                        "test_type": rec.test_type,
                        "difficulty": rec.difficulty,
                        "question_text": rec.question_text,
                    }
                    for rec in records
                ],
            }
        )

        for rec in records:
            summary_counter_cross[rec.exam_type] += 1

    cross_duplicates.sort(key=lambda item: (item["category"], item["question_preview"].lower()))
    same_duplicates.sort(key=lambda item: (item["category"], item["question_preview"].lower()))

    report = {
        "total_clusters": len(cross_duplicates),
        "summary_by_exam_type": dict(summary_counter_cross),
        "clusters": cross_duplicates,
    }

    if include_intra_exam:
        report["intra_exam_duplicates"] = {
            "total_clusters": len(same_duplicates),
            "summary_by_exam_type": dict(summary_counter_same),
            "clusters": same_duplicates,
        }

    return report


def _representative_pairs(records: List[QuestionRow], max_pairs: int) -> Tuple[List[Dict[str, object]], float, float]:
    pairs: List[Dict[str, object]] = []
    similarities: List[float] = []

    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            rec_a = records[i]
            rec_b = records[j]
            if rec_a.exam_type == rec_b.exam_type:
                continue
            ratio = SequenceMatcher(None, rec_a.normalized_text, rec_b.normalized_text).ratio()
            similarities.append(ratio)
            pairs.append(
                {
                    "similarity": round(ratio, 3),
                    "exam_types": [rec_a.exam_type, rec_b.exam_type],
                    "ids": [rec_a.id, rec_b.id],
                    "text_a": preview(rec_a.question_text, length=80),
                    "text_b": preview(rec_b.question_text, length=80),
                }
            )

    if not similarities:
        return [], 0.0, 0.0

    pairs.sort(key=lambda item: item["similarity"], reverse=True)
    return pairs[:max_pairs], min(similarities), max(similarities)


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("🔍 Fetching questions from Supabase…")
    rows = load_questions()
    print(f"✅ Loaded {len(rows)} question rows.")

    uf = UnionFind(len(rows))
    exact_groups = _build_exact_groups(rows)
    fuzzy_buckets = _build_fuzzy_buckets(rows)

    _link_exact_duplicates(uf, exact_groups, rows)
    _link_fuzzy_duplicates(uf, fuzzy_buckets, rows, args.similarity_threshold)

    report = _collect_clusters(
        uf,
        rows,
        args.min_count,
        args.max_pairs_per_cluster,
        include_intra_exam=args.include_intra_exam,
    )

    output_path = output_dir / "cross_exam_duplicates.json"
    dump_json(str(output_path), report)

    print("📄 Cross-exam duplicate report written to:")
    print(f"   {output_path}")
    print(f"   total clusters: {report['total_clusters']}")


if __name__ == "__main__":
    main()

