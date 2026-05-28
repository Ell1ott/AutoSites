"""Tests for lenient MCP argument coercion."""
from __future__ import annotations

import json

import pytest

from autosites_mcp.utils.coerce import (
    coerce_filters,
    coerce_int,
    coerce_json_array,
    coerce_json_object,
    coerce_sort,
)


class TestCoerceFilters:
    def test_none_and_empty(self):
        assert coerce_filters(None) is None
        assert coerce_filters("") is None
        assert coerce_filters({}) is None

    def test_dict_dsl(self):
        assert coerce_filters({"lead_score": {"gte": 7}}) == {
            "lead_score": {"gte": 7},
        }

    def test_json_string(self):
        raw = '{"lead_score": {"gte": 7}}'
        assert coerce_filters(raw) == {"lead_score": {"gte": 7}}

    def test_double_encoded_json(self):
        inner = json.dumps({"website": {"exists": True}})
        outer = json.dumps(inner)
        assert coerce_filters(outer) == {"website": {"exists": True}}

    def test_agent_passes_dict_not_string(self):
        assert coerce_filters({"lead_score": {"gte": 7}}) == {
            "lead_score": {"gte": 7},
        }

    def test_wrapped_filters_key(self):
        assert coerce_filters({"filters": {"lead_score": {"gte": 5}}}) == {
            "lead_score": {"gte": 5},
        }

    def test_clause_array(self):
        clauses = [
            {"key": "lead_score", "op": "gte", "value": 7},
            {"key": "website", "op": "exists"},
        ]
        assert coerce_filters(clauses) == {
            "lead_score": {"gte": 7},
            "website": {"exists": True},
        }

    def test_query_string(self):
        qs = "where[lead_score][gte]=7&where[name][like]=%cafe%"
        assert coerce_filters(qs) == {
            "lead_score": {"gte": "7"},
            "name": {"like": "%cafe%"},
        }

    def test_mongo_ops(self):
        assert coerce_filters({"rating": {"$gte": 4}}) == {"rating": {"gte": 4}}

    def test_bare_value_is_eq(self):
        assert coerce_filters({"name": "Acme"}) == {"name": {"eq": "Acme"}}

    def test_exists_false_means_notexists(self):
        assert coerce_filters({"design_prompt": {"exists": False}}) == {
            "design_prompt": {"notexists": True},
        }


class TestCoerceSort:
    def test_from_sort_key_dir(self):
        assert coerce_sort(sort_key="lead_score", sort_dir="desc") == {
            "key": "lead_score",
            "dir": "desc",
        }

    def test_from_sort_object(self):
        assert coerce_sort(sort={"key": "rating", "dir": "asc"}) == {
            "key": "rating",
            "dir": "asc",
        }

    def test_colon_string(self):
        assert coerce_sort(sort="lead_score:DESC") == {
            "key": "lead_score",
            "dir": "desc",
        }


class TestCoerceJsonObject:
    def test_dict(self):
        assert coerce_json_object({"lead_score": 8}) == {"lead_score": 8}

    def test_string(self):
        assert coerce_json_object('{"a": 1}') == {"a": 1}

    def test_set_wrapper(self):
        assert coerce_json_object({"set": {"x": 1}}) == {"x": 1}


class TestCoerceJsonArray:
    def test_list(self):
        assert coerce_json_array(["a", "b"]) == ["a", "b"]

    def test_csv_string(self):
        assert coerce_json_array("a, b , c") == ["a", "b", "c"]


class TestCoerceInt:
    def test_string(self):
        assert coerce_int("25", default=50, minimum=1, maximum=500) == 25

    def test_clamps(self):
        assert coerce_int(9999, default=50, minimum=1, maximum=500) == 500
