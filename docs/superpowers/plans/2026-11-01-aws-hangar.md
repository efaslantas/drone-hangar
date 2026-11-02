# AWS Hangar publication

Goal: publish verified v2.16.0-7f5130339846 on user's existing Zenth EC2 after explicit destination confirmation.
Environment: i-0b40d5bd73f2e3b3a/eu-central-1/ARM64/t4g.small; SSM only. Runtime7existing Zenth/Gelişim containers,1083MBavailable/12GBdiskfree observed. Preserve their images/env/data/routes. No SG/SSH port change, no Zenth app deployment. Zenth make-deploy rule governs its web/backend; documented SSM nginx maintenance path applies auxiliary route.

Design: local ARM64 image from239verified source manifest, private existing S3 artifact transport, no shared registry latest tag. Separate app data/env/network;256MBlimit/384MBswap/.5CPU/64PIDs/nonroot/no capabilities/read-onlyroot. Existing nginx connects auxiliary network; no app host port and no Zenth DB network joined by app. Dynamic Docker DNS upstream avoids startup reload dependency. Distinct sslip.io hostname separates origin/cookies from financial domains and needs no new GoDaddy record. Existing certbot account/HTTP-01 challenge and renewal path, new certificate only. Keep all existing nginx bytes plus appended owned include, backup/test/graceful reload/rollback. Persist route under existing certificate webroot mount; future manual nginx full sync/recreation must retain include/network (runbook records repair).

Data: Azure inaccessible; no legacy leaderboard/admin state can be fetched. New app uses separate empty volume; no local test data imported, no previous data deleted. Browser-origin preferences/calibration migration is a separate verification; do not claim saved origin state moved automatically.

- [x] BuildARM64 locally; private S3+SSM transport; verify image/hash and internal app health/resource isolation.
- [x] PrepareACMEcert and concrete nginx route/rollback; fresh review scripts before public proxy reload.
- [x] PublishHTTPS/WS/sourceassets/API checks; verify Zenth/Gelişim unchanged/healthy; browserprofile/notes/runbook.
