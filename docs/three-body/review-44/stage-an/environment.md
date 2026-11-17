# Read-only environment ledger

| Scope and field | Status | Evidence and method |
|---|---|---|
| Development host edition/build/UBR/architecture | ACQUIRED | local registry and current Node metadata, environment-local.json |
| Development Node absolute path/bytes/SHA/version/ABI/N-API, package lock and tooling | ACQUIRED | original executable file size/SHA256, process metadata and package manifests, compared with AM |
| Isolated Windows guest edition/build/UBR/architecture | NOT_OBTAINED | authenticated read-only guest inventory tied to exact VM, confirm with operator |
| VM image origin/hash and snapshot/rollback policy | NOT_OBTAINED | acquire provisioner original image digest and version, authenticated hypervisor snapshot policy |
| VM UUID/generation/epoch and hypervisor product/version/ID | NOT_OBTAINED | owner-provided management inventory readback, compare generation outside guest rollback domain |
| Host/guest/R boundaries, network/power/control-plane independence | UNKNOWN | asset and dependency map plus independent facility/operator corroboration |
| Job hierarchy/limits, account identity and rights | NOT_OBTAINED | signed existing guest policy and independent account/containment inventory, future native evidence for dynamic limits |
| VM read and operation authority | NOT_OBTAINED | approved read-role and existing VM-scoped ACL export from authorized owner, no changes |
| R station/operator/location and management role | NOT_OBTAINED | authenticated asset/authority records and lookup from separate authorized reader |
| R heartbeat, STOP API and status source | DESIGN_CANDIDATE | R monotonic receive clock outside guest, authenticated VM-scoped management operation, independent fresh state observation |
| R own hang/crash/unreachable and independent storage | UNKNOWN | no service or independent path receipt acquired, guarantee NONE |
| Compiler/linker/SDK/CRT, target Windows API version | UNKNOWN | actual installed product metadata, file versions and SHA under future approved inventory |
| Native architecture/calling convention/layout | DESIGN_CANDIDATE | standalone M executable. Future compiler/SDK FLAGS, sizes/alignments and ABI proof needed |
| DLL closure and IPC transport/version | NOT_OBTAINED | exact DLL import/load list, paths and hashes. Versioned bounded authenticated IPC with peer identity is a proposal |
| Source/tree/blob, executable SHA, signature/chain | NOT_IMPLEMENTED | source-to-build-to-binary manifest specified below, no physical binary available |

The repo, review and previously retained local evidence do not identify an approved Stage AN VM, read endpoint or R principal. No VM discovery against arbitrary hosts, authenticated management operation, Job query, privilege change, signing operation or build was used. The local development host is its own observation scope.

A future binary manifest must bind each A–G/R role, repository ID, source commit/tree/blob, compiler/linker executable and SDK/CRT dependencies, exact flags/arch/ABI/layout, target API and DLL search/load boundary, reproducible build inputs, image/OS identity, binary original bytes/size/SHA and signature/trust-chain verification receipts. Node and IPC are separately versioned. Candidate API documentation does not pin a guest build. Independent auditor reads back exact original binary and toolchain fingerprints under separate authorization. Binary rows A–G/R currently have status NOT_IMPLEMENTED and no fabricated identities.
