"""Read-only STAGING anonymous REST audit. HEAD only; never fetch row bodies."""
import os,re,sys
from urllib.error import HTTPError,URLError
from urllib.parse import urlencode
from urllib.request import Request,urlopen

BASE="https://bairmdubhnodwplioxld.supabase.co/rest/v1"
def classify(status,count,mode):
    if status is None:return "REVIEW"
    if mode=="column":
        return "PASS" if status in (401,403) else "REVIEW"
    if mode=="public":
        if status in (401,403):return "FAIL"
        return "PASS" if status in (200,206) and count is not None else "REVIEW"
    if mode=="hidden":
        if status in (401,403):return "PASS"
        if status in (200,206):
            if count is None:return "REVIEW"
            return "PASS" if count==0 else "FAIL"
    return "REVIEW"

def probe(key,table,filters=None,column="id"):
    query=urlencode({"select":column,**(filters or {})})
    req=Request(BASE+"/"+table+"?"+query,method="HEAD",headers={"apikey":key,"Prefer":"count=exact","Range":"0-0","Accept":"application/json"})
    try:
        with urlopen(req,timeout=15) as resp:status=resp.status;count_header=resp.headers.get("Content-Range","")
    except HTTPError as err:
        status=err.code;count_header=err.headers.get("Content-Range","");err.close()
    except (URLError,TimeoutError,OSError):
        return None,None
    match=re.search(r"/(\\d+)\\s*$",count_header)
    return status,int(match.group(1)) if match else None

def main():
    key=os.environ.get("STAGING_PUBLISHABLE_KEY","").strip()
    if not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]{10,}",key):
        print("REVIEW: missing STAGING publishable key");return 2
    checks=[
      ("Approved public points","map_points",{"visibility":"eq.public","review_status":"eq.approved"},"public","id"),
      ("Private points","map_points",{"visibility":"eq.private"},"hidden","id"),
      ("Unapproved points","map_points",{"review_status":"neq.approved"},"hidden","id"),
      ("Reports","point_reports",{},"hidden","id"),
      ("Admin memberships","app_admins",{},"hidden","user_id"),
      ("Report history","moderation_history",{},"hidden","id"),
      ("Point history","point_moderation_history",{},"hidden","id"),
    ]
    results=[]
    for label,table,filters,mode,column in checks:
        status,count=probe(key,table,filters,column)
        verdict=classify(status,count,mode);results.append(verdict)
        print(f"{verdict}: {label}; HTTP {status}; no row bodies")
    status,count=probe(key,"map_points",{"visibility":"eq.public","review_status":"eq.approved"},"user_id")
    if classify(status,count,"column")=="REVIEW":
        print("::warning::Review anonymous SELECT privilege on map_points.user_id; no values retrieved")
    if "FAIL" in results:return 1
    if "REVIEW" in results:return 2
    print("PASS: observed metadata only; NOT a certification of RLS");return 0

if __name__=="__main__":sys.exit(main())
