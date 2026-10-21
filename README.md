# EasyPlan public source snapshots
Official public event, hobby and benefit information used by EasyPlan. No user data or API credentials are stored here.

The daily GitHub Actions job runs around 06:17 Asia/Seoul (queue delays are possible). It calls EasyPlan collectors, preserves the last successful source on failure, and commits snapshots. The site reads these snapshots with its bundled seed as fallback. Source pages remain authoritative. Poster and content rights belong to their respective owners; this repository grants no additional rights to source material.

`status.json` records the last scheduled run and failed source IDs. Workflow runs show per-source results. `workflow_dispatch` can refresh manually. Each newly added source must also be added to `data.json` when deployed.
