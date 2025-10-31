#!/usr/bin/env python3
"""Aggregate diagnostics outputs into a single HTML and console summary."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from question_audit.logging_utils import info


DEFAULT_DIR = Path("diagnostics_output")
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport de revue des questions</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; }
    h1, h2 { color: #1f2937; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f3f4f6; text-align: left; }
    code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
    .pill { display: inline-block; padding: 2px 8px; background: #e5e7eb; border-radius: 999px; font-size: 0.8rem; margin-right: 0.5rem; }
  </style>
</head>
<body>
  <h1>Rapport global des anomalies</h1>
  <p>Généré automatiquement via <code>review_all_issues.py</code>.</p>

  <h2>Résumé</h2>
  <ul>
    <li>Explications à revoir : {explanations_count}</li>
    <li>Suggestions GPT générées : {suggestions_count}</li>
    <li>Questions dupliquées : {duplicates_count}</li>
    <li>Questions potentiellement mal catégorisées : {miscategorized_count}</li>
    <li>Questions matrices formatées : {matrix_count}</li>
    <li>Questions matrices non reconnues : {matrix_unmatched_count}</li>
  </ul>

  <h2>Explications à revoir</h2>
  {explanations_table}

  <h2>Suggestions GPT</h2>
  {suggestions_table}

  <h2>Questions en double</h2>
  {duplicates_table}

  <h2>Catégorisation à valider</h2>
  {miscategorized_table}

  <h2>Questions matrices</h2>
  {matrix_table}

  <h2>Questions matrices non parsées</h2>
  {matrix_unmatched_table}
</body>
</html>
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_DIR,
        help="Répertoire contenant les JSON d'analyse (default: diagnostics_output)",
    )
    parser.add_argument(
        "--html",
        default="diagnostics_output/master_review_report.html",
        help="Chemin du rapport HTML à générer",
    )
    return parser.parse_args()


def load_json(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def render_table(headers: List[str], rows: List[List[str]]) -> str:
    if not rows:
        return "<p>Aucune donnée.</p>"
    thead = "".join(f"<th>{header}</th>" for header in headers)
    tbody = ""
    for row in rows:
        tbody += "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>"
    return f"<table><thead><tr>{thead}</tr></thead><tbody>{tbody}</tbody></table>"


def main() -> None:
    args = parse_args()
    base_dir = Path(args.output_dir)
    base_dir.mkdir(parents=True, exist_ok=True)

    explanations = load_json(base_dir / "flagged_explanations.json")
    suggestions = load_json(base_dir / "suggested_explanations.json")
    duplicates = load_json(base_dir / "duplicate_questions.json")
    miscategorized = load_json(base_dir / "miscategorized_questions.json")
    matrix = load_json(base_dir / "matrix_questions.json")
    matrix_unmatched = load_json(base_dir / "matrix_questions_unmatched.json")

    explanations_table = render_table(
        ["ID", "Exam", "Catégorie", "Raisons", "Aperçu question"],
        [
            [
                item["question_id"],
                item.get("exam_type", ""),
                item.get("category", ""),
                ", ".join(item.get("reason_flags", [])),
                item.get("question_preview", ""),
            ]
            for item in explanations
        ],
    )

    suggestions_table = render_table(
        ["ID", "Raison", "Suggestion"],
        [
            [
                item["question_id"],
                ", ".join(item.get("reason_flagged", []))
                if isinstance(item.get("reason_flagged"), list)
                else item.get("reason_flagged"),
                item.get("suggested_explanation", "").replace("\n", "<br/>"),
            ]
            for item in suggestions
        ],
    )

    duplicates_table = render_table(
        ["Exam", "Prévisualisation", "Conserver", "Supprimer"],
        [
            [
                item["exam_type"],
                item.get("question_text_preview", ""),
                item.get("keep_id", ""),
                ", ".join(item.get("delete_ids", [])),
            ]
            for item in duplicates
        ],
    )

    miscategorized_table = render_table(
        ["ID", "Catégorie actuelle", "Catégorie suggérée", "Confiance", "Aperçu"],
        [
            [
                item["question_id"],
                item.get("current_category", ""),
                item.get("suggested_category", ""),
                item.get("confidence", ""),
                item.get("question_preview", ""),
            ]
            for item in miscategorized
        ],
    )

    matrix_table = render_table(
        ["ID", "Exam", "Aperçu", "HTML"],
        [
            [
                item["question_id"],
                item.get("exam_type", ""),
                item.get("question_preview", ""),
                item.get("formatted_html", "").replace("<", "&lt;").replace(">", "&gt;"),
            ]
            for item in matrix
        ],
    )

    matrix_unmatched_table = render_table(
        ["ID", "Aperçu"],
        [
            [
                item["question_id"],
                item.get("question_preview", ""),
            ]
            for item in matrix_unmatched
        ],
    )

    html_output = HTML_TEMPLATE.format(
        explanations_count=len(explanations),
        suggestions_count=len(suggestions),
        duplicates_count=len(duplicates),
        miscategorized_count=len(miscategorized),
        matrix_count=len(matrix),
        matrix_unmatched_count=len(matrix_unmatched),
        explanations_table=explanations_table,
        suggestions_table=suggestions_table,
        duplicates_table=duplicates_table,
        miscategorized_table=miscategorized_table,
        matrix_table=matrix_table,
        matrix_unmatched_table=matrix_unmatched_table,
    )

    html_path = Path(args.html)
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(html_output, encoding="utf-8")

    info(f"Rapport généré : {html_path}")
    info(
        f"Explications={len(explanations)}, Suggestions={len(suggestions)}, "
        f"Doublons={len(duplicates)}, Catégories={len(miscategorized)}, "
        f"Matrices={len(matrix)}, Matrices non parsées={len(matrix_unmatched)}"
    )


if __name__ == "__main__":
    main()
