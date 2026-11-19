import unittest
from scripts.staging_anon_rls_check import classify


class ClassificationTests(unittest.TestCase):
    def check(self, mode, status, count, expected):
        self.assertEqual(classify(status, count, mode).status, expected)

    def test_hidden_rows_return_200_zero(self):
        self.check("hidden", 200, 0, "PASS")

    def test_hidden_rows_return_206_zero(self):
        self.check("hidden", 206, 0, "PASS")

    def test_hidden_table_denies_access(self):
        self.check("hidden", 403, None, "PASS")

    def test_hidden_rows_return_visible_count(self):
        self.check("hidden", 200, 3, "FAIL")

    def test_missing_content_range_is_inconclusive(self):
        self.check("hidden", 200, None, "REVIEW")

    def test_network_failure_is_inconclusive(self):
        self.check("hidden", None, None, "REVIEW")

    def test_public_rows_are_accessible(self):
        self.check("public", 200, 0, "PASS")
        self.check("public", 206, 5, "PASS")

    def test_public_endpoint_denied_is_failure(self):
        self.check("public", 401, None, "FAIL")

    def test_public_endpoint_missing_count(self):
        self.check("public", 200, None, "REVIEW")

    def test_sensitive_column_denied(self):
        self.check("column", 403, None, "PASS")

    def test_sensitive_column_selectable_needs_review(self):
        self.check("column", 200, 3, "REVIEW")
        self.check("column", 200, 0, "REVIEW")

    def test_unexpected_column_status(self):
        self.check("column", 400, None, "REVIEW")


if __name__ == "__main__":
    unittest.main()
