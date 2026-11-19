import unittest
from scripts.staging_anon_rls_check import classify
class ClassificationTests(unittest.TestCase):
 def check(self,mode,status,count,expected):self.assertEqual(classify(status,count,mode),expected)
 def test_hidden_200_zero(self):self.check("hidden",200,0,"PASS")
 def test_hidden_206_zero(self):self.check("hidden",206,0,"PASS")
 def test_hidden_denied(self):self.check("hidden",403,None,"PASS")
 def test_hidden_visible(self):self.check("hidden",200,3,"FAIL")
 def test_hidden_no_count(self):self.check("hidden",200,None,"REVIEW")
 def test_network_error(self):self.check("hidden",None,None,"REVIEW")
 def test_public_zero(self):self.check("public",200,0,"PASS")
 def test_public_nonzero(self):self.check("public",206,5,"PASS")
 def test_public_denied(self):self.check("public",401,None,"FAIL")
 def test_public_unknown(self):self.check("public",200,None,"REVIEW")
 def test_column_denied(self):self.check("column",403,None,"PASS")
 def test_column_selectable(self):self.check("column",200,3,"REVIEW")
