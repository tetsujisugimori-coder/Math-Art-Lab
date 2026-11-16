# Finite ceilings and explicit approval boundaries

AH unchanged: original5000ms, parent30000ms, total90000ms;2 OFF->ON slots, retry0/replacement0/no reorder. AJ unchanged: ordered8-condition upper bound, <=10000ms each, <=90000ms total, first failure blocks all remaining. 80000ms arithmetic maximum does not prove preparation, monitoring, stop, persistence and cleanup fit; feasibility NOT_TESTED. No hidden grace or success-until-retry. Not-run/blocked slots never become completed/PASS.

External R milestones are unapproved design proposals inside the existing per-slot/parent ceilings, not new settings or measurements. Their independent start-before-dispatch handshake and own clock would include orchestration overhead. R/guest CPU and wall clocks cannot be subtracted. Latency/clock linkage/deadline behavior must be independently proved under separate approval; a missed or unobservable milestone is failure/UNKNOWN, not an excuse to add time. No residual allocation to OS/GC/JIT.

1 Design limited acceptance: permits this local snapshot and independent static/mock review while both P2 remain OPEN.
2 Safe publication: requires separate approval for an existing workflow change or other plan avoiding the original Vitest trigger. Current commit/push HOLD; no bypass/skip-CI.
3 Physical implementation: requires explicit approval of exact A-G/R/native interfaces, source ownership/dependencies, VM/account/management identities and least privileges; implementation approval does not grant launch authority.
4 Physical fault injection/qualification: requires independently reviewed closure of AK01/02, real image/toolchain/binary/ACL/containment/recovery evidence, finite exact plan/ceilings/artifacts and explicit execution approval. If hang recovery is not demonstrated, do not start its fixture or the qualification campaign.
5 Original Vitest observation: separate authorization under AH plan/AB/AC policy; not implied by any earlier stage.

P2 closure criteria include falsification and original evidence; a proposed external agent, human promise, sample API call or static SHA cannot substitute for actual safe recovery. Human actions are manual and may be unbounded. Stop at requesting the above explicit approvals; this task grants none of them.
