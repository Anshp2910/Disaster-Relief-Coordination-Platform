import urllib.request
import urllib.parse
import urllib.error
import sys
import time
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

OUTPUT_DIR = "C:\\Disaster Relief Coordination Platform\\dfd_diagrams"

L0 = """@startuml Disaster Relief Coordination Platform - DFD Level 0
!theme plain
skinparam backgroundColor #ffffff
skinparam handwritten false
skinparam defaultTextAlignment center
title Disaster Relief Coordination Platform — DFD Level 0 (Context Diagram)

rectangle "DRCP System\\n\\nExpress API + Socket.IO\\nReact Client + MongoDB" as System #add8e6

actor "Public User\\n(Unauthenticated)" as PublicUser
actor "Volunteer / NGO\\n(Self-Registered)" as VolunteerNGO
actor "Admin\\n(Role: Admin)" as Admin
rectangle "Email Service\\n(Resend / SMTP)" as Email
rectangle "Open-Meteo\\nWeather API" as Weather

PublicUser -[#1f77b4]down-> System : View public overview / stats
VolunteerNGO -[#1f77b4]down-> System : Register / Login\\nCreate & Claim Requests\\nManage Resources\\nReal-time Chat\\nBroadcast SOS\\nView Schedules\\nSubmit Feedback
Admin -[#1f77b4]down-> System : Full CRUD all records\\nAnalytics Dashboard\\nBulk Import/Export\\nRole Management\\nManage Zones & Incidents\\nSeed Demo Data

System -[#2ca02c]down-> Email : Password reset email
System -[#ff7f0e]-> Weather : GET current weather\\n(lat / lng, 5-min cache)
System -[#9467bd]-> VolunteerNGO : Real-time notifications\\n(WebSocket)
System -[#9467bd]-> Admin : Real-time alerts

@enduml"""

L1 = """@startuml Disaster Relief Coordination Platform - DFD Level 1
!theme plain
skinparam backgroundColor #ffffff
skinparam handwritten false
skinparam defaultTextAlignment center
title Disaster Relief Coordination Platform — DFD Level 1 (Process Decomposition)

' ========== External Entities ==========
actor "Public User" as E1
actor "Volunteer / NGO" as E2
actor "Admin" as E3
rectangle "Email\\nService" as E4
rectangle "Open-Meteo\\nWeather API" as E5
rectangle "GIS Services" as E6

' ========== Data Stores ==========
database "D1 Users" as D1
database "D2 Requests\\n+ Files + AuditLog" as D2
database "D3 Resources" as D3
database "D4 Zones" as D4
database "D5 Incidents" as D5
database "D6 SOS Alerts" as D6
database "D7 Chat Messages\\n(90-day TTL)" as D7
database "D8 Schedules" as D8
database "D9 Feedback" as D9

' ========== Processes ==========
rectangle "P1\\nAuth &\\nAuthorization" as P1 #fff2cc
rectangle "P2\\nRequest\\nManager" as P2 #d9ead3
rectangle "P3\\nResource\\nManager" as P3 #d0e0e3
rectangle "P4\\nZone & Incident\\nManager" as P4 #f4cccc
rectangle "P5\\nSOS & Alert\\nService" as P5 #d9ead3
rectangle "P6\\nChat &\\nNotification\\nService" as P6 #f4cccc
rectangle "P7\\nVolunteer\\nScheduler" as P7 #fff2cc
rectangle "P8\\nAnalytics &\\nAdmin Console" as P8 #d0e0e3

' ========== P1 Auth Flows ==========
E2 -[#1f77b4]down-> P1 : Register / Login
E3 -[#1f77b4]down-> P1 : Admin Login
E1 -[#1f77b4]down-> P1 : Public routes (no auth)
P1 <->[#666666] D1 : Create / Read users\\nIssue JWT tokens\\nRole validation
E4 <-[#2ca02c]- P1 : Password reset email

' ========== P2 Request Flows ==========
E2 -[#1f77b4]down-> P2 : Create / View / Claim\\nAdd Comments / Files
E3 -[#1f77b4]down-> P2 : CRUD all requests\\nEscalate requests
P1 -[dotted]-> P2 : Authenticated user ID
P2 <->[#666666] D2 : CRUD requests\\nGeoJSON queries\\nAuditLog
P6 <-[#ff7f0e]- P2 : WS: request:updated
P6 <-[#ff7f0e]- P2 : WS: request:escalated

' ========== P3 Resource Flows ==========
E2 -[#1f77b4]down-> P3 : Create / Allocate\\nDeallocate / Smart Match
E3 -[#1f77b4]down-> P3 : CRUD all resources
P1 -[dotted]-> P3 : Authenticated user ID
P3 <->[#666666] D3 : CRUD resources\\nGeo queries\\nAllocation logic
P3 <->[#666666] D2 : Read request location\\n(smart matching)
P6 <-[#ff7f0e]- P3 : WS: resource:created
P6 <-[#ff7f0e]- P3 : WS: resource:allocated

' ========== P4 Zone & Incident Flows ==========
E3 -[#1f77b4]down-> P4 : Create / Update Zones\\nCreate / Update Incidents
P4 <->[#666666] D4 : CRUD zones\\nGeoWithin enrichment\\nCoverage status
P4 <->[#666666] D5 : CRUD incidents\\nAuditLog
P4 <->[#666666] D2 : Geo query requests\\nin zone radius
P4 <->[#666666] D3 : Geo query resources\\nin zone radius

' ========== P5 SOS Flows ==========
E2 -[#1f77b4]down-> P5 : Broadcast SOS\\n(location + message)
E3 -[#1f77b4]down-> P5 : Acknowledge SOS\\nResolve SOS
P5 <->[#666666] D6 : CRUD SOS alerts\\nDuplicate suppression
P6 <-[#ff7f0e]- P5 : WS: sos:alert

' ========== P6 Chat & Notification Flows ==========
E2 -[#1f77b4]down-> P6 : Send / Read Chat\\nMessages
P1 -[dotted]-> P6 : User identity
P6 <->[#666666] D7 : CRUD messages\\nSocket.IO rooms
P6 -[#ff7f0e]right-> E2 : Real-time notification
P6 -[#ff7f0e]right-> E3 : Real-time alert

' ========== P7 Schedule Flows ==========
E2 -[#1f77b4]down-> P7 : Create / Update\\nMy Schedule
E3 -[#1f77b4]down-> P7 : Assign any user\\nView all schedules
P1 -[dotted]-> P7 : User identity
P7 <->[#666666] D8 : CRUD schedules
P6 <-[#ff7f0e]- P7 : WS: schedule:deleted

' ========== P8 Analytics & Admin Flows ==========
E3 -[#1f77b4]down-> P8 : View Analytics\\nBulk Import/Export\\nManage Users\\nSeed Demo Data
P1 -[dotted]-> P8 : Role check (requireAdmin)
P8 <->[#666666] D1 : User stats / role change\\nCascade delete user
P8 <->[#666666] D2 : Full request list\\nAnalytics aggregations\\nCSV / JSON export
P8 <->[#666666] D3 : Resource stats\\nCSV export
P8 <->[#666666] D6 : SOS stats
P8 <->[#666666] D9 : Feedback stats
P8 <->[#666666] D5 : Incident & Zone stats
P8 <->[#666666] D4 : Zone stats

E2 -[#1f77b4]down-> P8 : View weather info
E3 -[#1f77b4]down-> P8 : View weather info
P8 -[#ff7f0e]-> E5 : GET current weather\\n(5-min in-memory cache)
P8 -[#ff7f0e]-> E6 : Fetch map tiles\\nGeocoding queries

@enduml"""

ENDPOINT = "https://www.planttext.com/api/plantuml"

def encode_and_draw(plantuml_text, out_path, label="diagram"):
    data = plantuml_text.encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "text/plain"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = resp.read().decode("utf-8").strip()
    except Exception as e:
        print(f"  ERROR on encode: {e}")
        return False

    img_url = f"https://www.planttext.com/api/plantuml/img/{result}"
    print(f"  Image URL: {img_url}")
    try:
        with urllib.request.urlopen(img_url, timeout=120) as resp:
            img_data = resp.read()
    except Exception as e:
        print(f"  ERROR on image fetch: {e}")
        return False

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(img_data)
    size_kb = len(img_data) / 1024
    print(f"  Saved: {out_path}  ({size_kb:.1f} KB)")
    return True

def main():
    diagrams = [
        (L0, os.path.join(OUTPUT_DIR, "DFD_Level0_Context.png"),  "Level 0"),
        (L1, os.path.join(OUTPUT_DIR, "DFD_Level1_Decomposition.png"), "Level 1"),
    ]

    print("=" * 55)
    print("  Rendering DRCP DFD Diagrams → PNG")
    print("=" * 55)

    ok = 0
    for text, path, label in diagrams:
        print(f"\n[{label}] Rendering ...")
        if encode_and_draw(text, path, label):
            ok += 1
        time.sleep(1)

    print("\n" + "=" * 55)
    print(f"  Done. {ok}/{len(diagrams)} diagrams rendered.")
    print(f"  Output: {OUTPUT_DIR}")
    print("=" * 55)

if __name__ == "__main__":
    main()
