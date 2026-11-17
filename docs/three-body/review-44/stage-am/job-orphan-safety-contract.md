# AK02 creation-time containment (OPEN, physical UNKNOWN)
Candidate API sequence: CreateJobObjectW → SetInformationJobObject → InitializeProcThreadAttributeList/UpdateProcThreadAttribute(JOB_LIST) → CreateProcessW(STARTUPINFOEXW,EXTENDED_STARTUPINFO_PRESENT,CREATE_SUSPENDED) → IsProcessInJob → ResumeThread. No native call is implemented.
Microsoft documents JOB_LIST as a list assigned to a new child, ordered, on Win10+/Server2016+. CREATE_SUSPENDED suspends its primary thread. These facts do not establish complete creator-death rollback/atomicity in the actual VM. Before future process creation, require OS/build/API/hierarchy/ACL evidence and independently reviewed atomic containment proof; otherwise refuse creation. No post-create Assign fallback, breakaway or unconditional resume.
Before child creation M owns J. Returned process/thread handles become M-owned only on successful creation; an interrupted creation may leave their availability unknown. J is noninheritable and excluded from explicit IPC-only HANDLE_LIST. HANDLE_LIST requires bInheritHandles TRUE and only inheritable real IPC handles; no pseudo handles. Attribute value storage outlives list use. Rights, API return/GetLastError and native layout are separately fixed before implementation, never inferred from broad ALL_ACCESS.
M is outside J; P/W inside. All nested jobs and their restrictions must be known and compatible. Deny BREAKAWAY_OK and SILENT_BREAKAWAY_OK and child breakaway flags. Unsupported nesting/UI limits/rights failure rejects before creation; unexpected API failure blocks all remaining work.
Creator loss table:
| Boundary | Known evidence | Required handling |
|---|---|---|
|before Job creation|no child receipt|BLOCKED; no inferred child absence if create request uncertain|
|Job created/limits set|J identity/limits receipts|R independent recovery; final-close unknown until proved|
|attribute ready/before CreateProcess return|request may be in kernel|child existence/membership UNKNOWN; no fabricated rollback|
|CreateProcess returned suspended|process/thread handles, native birth|membership must be separately proved; never resume on creator loss|
|membership confirmed/before resume|positive membership receipt|resume not inferred; M loss still needs R recovery|
|resume attempted/returned|return count and receipt|require previous count1; DWORD(-1)/other count blocks; not execution completion|
At every loss, preserve prior stage/raw, UNKNOWN/NOT_OBTAINED and BLOCKED. M crash final-close may cause kill-on-close only if last handle ownership/no duplicates is proven; M hang keeps handles open, no such guarantee. Leak/inheritance/duplication defeats that premise.
Use VM UUID+generation+epoch+Job token+owner birth+retained process/thread handles+native creation identity. PID/name alone never targets stop. Old response or another incarnation/VM is rejected without touching unrelated processes.
STOP request, native send result, retained-handle signaled/exit status, Job membership/count query and resource closure each has its own original receipt. Notifications may be missing; a Job notification or STOP ack is not EXIT. Membership API return and boolean Result are separately checked. Exit time before actual termination cannot prove exit. Release evidence cannot be inferred from VM shutdown.
