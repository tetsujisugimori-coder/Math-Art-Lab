# Stage U local fixed CDP controls

Overall PARTIAL. Diagnostic cohort completed24/24;12 trials failed overall,0 unexecuted. Primary main operations were not sent in6 trials because the old-context ON intervention request timed out. Completion does not mean acceptance. No product changes.

Chromium 145.0.7632.6, Playwright 1.58.2, Windows 10.0.26300, Node v24.20.0. Contexts have12 fresh-browser trials each. Two samples per cell; RTT is harness-to-CDP-reply wall time, not internal CPU. All capture deadlines remain5000ms.

|Context|Operation|Readback|Layout RTT ms (two)|Capture RTT ms (two)|C gap ms|
|---|---|---|---|---|---|
|default|A|OFF|2.2465 / 1.1824|NOT_REQUESTED / NOT_REQUESTED|n/a|
|default|A|ON|NOT_SENT / NOT_SENT|NOT_SENT / NOT_SENT|n/a|
|default|B|OFF|NOT_REQUESTED / NOT_REQUESTED|TIMEOUT (reply unknown) / TIMEOUT (reply unknown)|n/a|
|default|B|ON|NOT_SENT / NOT_SENT|NOT_SENT / NOT_SENT|n/a|
|default|C|OFF|1.7413 / 1.0654|TIMEOUT (reply unknown) / TIMEOUT (reply unknown)|0.0555 / 0.0550|
|default|C|ON|NOT_SENT / NOT_SENT|NOT_SENT / NOT_SENT|NOT_SENT / NOT_SENT|
|readback|A|OFF|2.7601 / 2.5583|NOT_REQUESTED / NOT_REQUESTED|n/a|
|readback|A|ON|1.9183 / 0.7488|NOT_REQUESTED / NOT_REQUESTED|n/a|
|readback|B|OFF|NOT_REQUESTED / NOT_REQUESTED|200.7579 / 187.5472|n/a|
|readback|B|ON|NOT_REQUESTED / NOT_REQUESTED|186.3136 / 180.5857|n/a|
|readback|C|OFF|3.2816 / 2.5559|199.3077 / 184.0495|0.0579 / 0.0903|
|readback|C|ON|1.9517 / 2.0232|182.0813 / 192.5241|0.1185 / 0.0595|

12 layout requests sent and all replied;12 capture requests sent,8 acquired and4 timed out (old/OFF: B2 and C2). Four further planned captures were not sent (old/ON). Six old/ON readback Runtime requests timed out; the actual native call count/internal interval is unobserved. Timeout observation duration is not a reply RTT.

All8 acquired PNGs have SHA256 `2cb119d896d25f11ec827aa83d7f9936530fa3658baf594d8ac6acacc5c784e7`; decoded full bitmap SHA256 `25ebc206d4acb7f558660793330b655ec5775c2f78591c72defde7bdfcad7f96`. Each successful image is2560x1800; both Canvas regions differ by0 channels against actual post-capture readback. Four current/ON captures retain before/after pixels, also0 channels different. Old failed captures have no pixel verdict. A never captures. Command SHA equality alone is not pixel equality.

The first A/OFF layout response2.2465ms was retained, while its cleanup failed the new5000ms watchdog and blocked the initial prefix. After a read-only owned-child absence check, trial1 was imported byte-for-byte and only trials2–24 were executed in a new root. Cleanup budget failures remain failures; an additional bounded observation confirms disposal solely to continue independent trials. Both original and resumed source versions/manifests are preserved. No25th primary trial.

Available raw/summary hashes and the artifact index verify. Measurement records and captured evidence are incomplete; acceptance is NOT_ACCEPTED. E_SCREENSHOT is distinct from D_MEASUREMENT cleanup and G_NOT_ACQUIRED intervention/post-state. Available frozen-frame state observations remain30 with no timer/rAF; this is not live-physics safety proof.
