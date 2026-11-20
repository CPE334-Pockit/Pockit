#!/usr/bin/env bash
set -euo pipefail

# Deploy only Pockit team's pre-provisioned course resources. Review and merge
# the release to main before running this script. No infrastructure is created.
PROJECT_ID=cpe-se-course-2026
REGION=asia-southeast1
PREFIX=s4b043a2c
SERVICE_URL=https://s4b043a2c-4d7hbszvwq-as.a.run.app
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${PREFIX}/${PREFIX}"
DRY_RUN="${DRY_RUN:-1}"

run() {
  if [[ "$DRY_RUN" == 1 ]]; then
    printf '[DRY_RUN]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

[[ "$DRY_RUN" == 0 || "$DRY_RUN" == 1 ]] || {
  echo 'DRY_RUN must be 0 or 1' >&2
  exit 1
}

SHA="$(git rev-parse HEAD)"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || {
  echo 'Expected a full release commit SHA' >&2
  exit 1
}
if [[ "$DRY_RUN" == 0 ]]; then
  [[ "$(git branch --show-current)" == main ]] || {
    echo 'Deploy only the reviewed main branch' >&2
    exit 1
  }
  [[ -z "$(git status --porcelain)" ]] || {
    echo 'Deploy only a clean checkout' >&2
    exit 1
  }
  git fetch --quiet origin main
  [[ "$SHA" == "$(git rev-parse origin/main)" ]] || {
    echo 'Local main must match the reviewed remote release' >&2
    exit 1
  }
  [[ "$(gcloud config get-value project 2>/dev/null)" == "$PROJECT_ID" ]] || {
    echo 'Set the course project before deploying' >&2
    exit 1
  }
  gcloud run services describe "$PREFIX" --project="$PROJECT_ID" --region="$REGION" >/dev/null
  gcloud run jobs describe "${PREFIX}-migrate" --project="$PROJECT_ID" --region="$REGION" >/dev/null
fi

IMAGE="${IMAGE_BASE}:${SHA}"
run gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
run docker build --platform linux/amd64 -f Dockerfile \
  --build-arg "VITE_SERVER_URL=${SERVICE_URL}" \
  --secret id=web_env,src=apps/web/.env.example \
  --secret id=server_env,src=apps/server/.env.example \
  -t "$IMAGE" .
run docker push "$IMAGE"

# The portal has already connected DATABASE_URL and Cloud SQL to this job.
run gcloud run jobs update "${PREFIX}-migrate" \
  --image="$IMAGE" --command=bun --args=run,db:migrate:deploy \
  --update-env-vars=NODE_ENV=production \
  --project="$PROJECT_ID" --region="$REGION" --quiet
run gcloud run jobs execute "${PREFIX}-migrate" \
  --wait --project="$PROJECT_ID" --region="$REGION" --quiet

# Slot 2 holds a course User password chosen and stored by the team. The
# bootstrap command creates the identity once and preserves it on later runs.
run gcloud run jobs update "${PREFIX}-migrate" \
  --image="$IMAGE" --command=bun --args=apps/server/src/bootstrap-course.ts \
  --update-secrets="POCKIT_BOOTSTRAP_PASSWORD=${PREFIX}-app-secret-2:latest" \
  --project="$PROJECT_ID" --region="$REGION" --quiet
run gcloud run jobs execute "${PREFIX}-migrate" \
  --wait --project="$PROJECT_ID" --region="$REGION" --quiet

# Keep the portal's DATABASE_URL and ADMIN_PASSWORD mappings intact. The one
# additional secret slot contains Pockit's generated Better Auth signing key.
run gcloud run services update "$PREFIX" \
  --image="$IMAGE" --port=3000 --memory=1Gi --cpu=1 \
  --min-instances=0 --max-instances=1 \
  --update-env-vars="NODE_ENV=production,BETTER_AUTH_URL=${SERVICE_URL},CORS_ORIGIN=${SERVICE_URL},VITE_SERVER_URL=${SERVICE_URL}" \
  --update-secrets="BETTER_AUTH_SECRET=${PREFIX}-app-secret-1:latest" \
  --project="$PROJECT_ID" --region="$REGION" --quiet

if [[ "$DRY_RUN" == 0 ]]; then
  curl --fail --show-error --connect-timeout 5 --max-time 15 --retry 5 --retry-delay 3 "${SERVICE_URL}/api/health"
  curl --fail --show-error --connect-timeout 5 --max-time 15 --retry 5 --retry-delay 3 "${SERVICE_URL}/api/ready"
  curl --fail --show-error --connect-timeout 5 --max-time 15 --retry 5 --retry-delay 3 "${SERVICE_URL}/" >/dev/null
fi
printf 'Release image: %s\nService URL: %s\n' "$IMAGE" "$SERVICE_URL"
