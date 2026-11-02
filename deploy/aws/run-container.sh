#!/bin/bash
# Run on the authorized EC2 through SSM after image SHA/architecture verification.
# No Zenth/Gelişim container recreation or private database network membership.
set -euo pipefail
release=${1:?release required}
image="drone-hangar:$release"
root=/home/ec2-user/drone-hangar
mkdir -p "$root/data"
chmod 700 "$root" "$root/data"
chown 1000:1000 "$root/data"
exec 8>"$root/.deploy.guard"
flock -n 8
if docker inspect drone-hangar >/dev/null 2>&1; then
    echo 'Existing Hangar container found; use a reviewed update/rollback procedure.' >&2
    exit 1
fi
if ! docker network inspect drone-hangar-net >/dev/null 2>&1; then
    docker network create drone-hangar-net >/dev/null
fi
if [ ! -e "$root/runtime.env" ]; then
    python3 - <<'PY'
from pathlib import Path
import secrets,os
p=Path('/home/ec2-user/drone-hangar/runtime.env')
fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:f.write('NODE_ENV=production\nADMIN_KEY='+secrets.token_hex(32)+'\n')
PY
fi
chmod 600 "$root/runtime.env"
docker run -d --name drone-hangar \
    --restart unless-stopped --init --user 1000:1000 \
    --memory 256m --memory-swap 384m --cpus .5 --pids-limit 64 \
    --cap-drop ALL --security-opt no-new-privileges --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=16m \
    --network drone-hangar-net --network-alias drone-hangar-app \
    --env-file "$root/runtime.env" \
    --mount "type=bind,src=$root/data,dst=/app/server/data" \
    --log-opt max-size=5m --log-opt max-file=2 \
    "$image" >/dev/null
for attempt in 1 2 3 4 5; do
    if docker exec drone-hangar node -e 'require("http").get("http://127.0.0.1:8780/api/health",r=>{let s="";r.on("data",d=>s+=d);r.on("end",()=>{const h=JSON.parse(s);if(!h.ok||h.version!==process.argv[1])process.exit(1);console.log("Candidate healthy:",h.version)})}).on("error",()=>process.exit(1))' "$release"; then
        exit 0
    fi
    sleep 1
done
echo 'Candidate not healthy; left private for diagnosis, no public route changed' >&2
exit 1
