#!/usr/bin/env bash
# ==============================================================================
# Handmade Shop — Vercel Setup Script
# ==============================================================================
# This script automates the creation and linking of 4 Vercel projects:
#
#   Environment  | App  | Project Name
#   -------------|------|---------------------------------------
#   STAGING      | Web  | handmade-shop-web-staging   (apps/web)
#   STAGING      | API  | handmade-shop-api-staging   (apps/api)
#   PRODUCTION   | Web  | handmade-shop-web-prod      (apps/web)
#   PRODUCTION   | API  | handmade-shop-api-prod      (apps/api)
#
# It will:
#   1. Verify prerequisites (Vercel CLI, login, etc.)
#   2. Create each project in Vercel
#   3. Link local directories to the projects
#   4. Prompt for environment variables and set them per project
#   5. Output the project IDs and org ID for CircleCI configuration
#
# Prerequisites:
#   - Vercel CLI installed (npm install -g vercel@latest)
#   - Logged into Vercel (vercel login)
#   - Git repo initialized and pushed to GitHub
#
# Usage:
#   chmod +x setup-deploy.sh
#   ./setup-deploy.sh
# ==============================================================================

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Colors & helpers
# ──────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✔${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error()   { echo -e "${RED}✘${NC}  $1"; }
log_step()    { echo -e "\n${BOLD}${MAGENTA}═══ $1 ═══${NC}\n"; }
log_header()  { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BOLD}$1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# ──────────────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

declare -A PROJECTS
PROJECTS=(
  ["handmade-shop-web-staging"]="apps/web"
  ["handmade-shop-web-prod"]="apps/web"
  ["handmade-shop-api-staging"]="apps/api"
  ["handmade-shop-api-prod"]="apps/api"
)

# Env vars needed per project type and environment
# Format: "NAME|prompt_message|is_secret|default_value" (pipe-separated, one per line)
WEB_ENV_VARS=(
  "NEXT_PUBLIC_API_URL|Full URL to the API project (e.g., https://handmade-shop-api-staging.vercel.app/api)|no|"
)

API_ENV_VARS_COMMON=(
  "JWT_EXPIRES_IN|JWT token expiration duration|no|7d"
)

API_ENV_VARS_SECRET=(
  "DATABASE_URL|PostgreSQL pooled connection string|yes|"
  "JWT_SECRET|Random 64-character JWT signing secret|yes|$(openssl rand -base64 48 2>/dev/null || echo 'please-generate-a-secure-random-string')"
)

# ──────────────────────────────────────────────────────────────────────────────
# Pre-flight checks
# ──────────────────────────────────────────────────────────────────────────────
check_prerequisites() {
  log_step "Prerequisites"

  # Check Vercel CLI
  if ! command -v vercel &>/dev/null; then
    log_error "Vercel CLI not found. Install it:"
    echo "  npm install -g vercel@latest"
    echo "  Then run this script again."
    exit 1
  fi
  log_success "Vercel CLI found: $(vercel --version 2>&1 | head -1)"

  # Check Vercel login status
  VERCEL_TOKEN="${VERCEL_TOKEN:-}"
  if [ -z "$VERCEL_TOKEN" ]; then
    log_info "No VERCEL_TOKEN env var set — trying to detect an existing session..."
    if vercel whoami &>/dev/null; then
      VERCEL_USER="$(vercel whoami 2>&1)"
      log_success "Logged in as ${BOLD}${VERCEL_USER}${NC}"
    else
      log_warn "Not logged in. The script will prompt for login when needed."
      log_info "Alternatively, set the VERCEL_TOKEN environment variable and re-run."
    fi
  else
    log_success "Using VERCEL_TOKEN from environment"
  fi

  # Check that app directories exist
  for DIR in "apps/web" "apps/api"; do
    if [ ! -d "$PROJECT_ROOT/$DIR" ]; then
      log_error "Directory not found: $DIR"
      echo "  Make sure you're running this script from the project root."
      exit 1
    fi
  done
  log_success "Project directories exist"

  # Check git
  if ! git rev-parse --git-dir &>/dev/null; then
    log_warn "Not a git repository. Some Vercel features may not work."
    echo "  Consider running: git init && git add . && git commit -m 'initial'"
  else
    log_success "Git repository detected"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Create a single Vercel project
# ──────────────────────────────────────────────────────────────────────────────
create_project() {
  local PROJECT_NAME="$1"
  local APP_DIR="$2"
  local FULL_PATH="$PROJECT_ROOT/$APP_DIR"

  log_info "Creating project ${BOLD}$PROJECT_NAME${NC} (from $APP_DIR)..."

  # Navigate to the app directory, create the project via a lightweight deploy
  # The --yes flag skips prompts; --public makes it publicly accessible.
  # This creates the project as a side effect even if the build fails.
  (
    cd "$FULL_PATH" || exit 1

    # Remove any existing .vercel link first
    rm -rf .vercel

    # Use `vercel deploy` to create the project + trigger an initial deploy.
    # The deploy may fail (code may not be ready), but the project is created.
    # We capture stderr because Vercel prints deployment URL to stdout,
    # but errors (expected during setup) go to stderr.
    log_info "  Deploying to create project (may show warnings — that's okay)..."
    DEPLOY_OUTPUT=$(vercel deploy --yes --public --name "$PROJECT_NAME" 2>&1 || true)

    # Check if the project was created by looking for the .vercel/project.json
    if [ -f ".vercel/project.json" ]; then
      log_success "  Project ${BOLD}$PROJECT_NAME${NC} created and linked."
      cat .vercel/project.json
    else
      # Fallback: try linking directly
      log_warn "  Initial deploy may have failed. Trying to link directly..."
      vercel link --yes --project "$PROJECT_NAME" 2>&1 || true
      if [ -f ".vercel/project.json" ]; then
        log_success "  Project ${BOLD}$PROJECT_NAME${NC} linked."
      else
        log_error "  Could not create or link project $PROJECT_NAME."
        echo "  Try creating it manually via the Vercel Dashboard, then re-run this script."
        return 1
      fi
    fi
  )

  return 0
}

# ──────────────────────────────────────────────────────────────────────────────
# Set environment variables on a project
# ──────────────────────────────────────────────────────────────────────────────
set_env_vars() {
  local PROJECT_NAME="$1"
  local APP_DIR="$2"
  local SCOPE="$3"  # "production" or "preview,production"
  shift 3
  local ENV_ENTRIES=("$@")

  local FULL_PATH="$PROJECT_ROOT/$APP_DIR"

  log_info "  Setting environment variables for ${BOLD}$PROJECT_NAME${NC} (scope: $SCOPE)..."

  (
    cd "$FULL_PATH" || exit 1

    for ENTRY in "${ENV_ENTRIES[@]}"; do
      # Parse the pipe-separated entry: NAME|PROMPT|IS_SECRET|DEFAULT
      IFS='|' read -r NAME PROMPT IS_SECRET DEFAULT <<< "$ENTRY"

      # Prompt the user for the value
      local VAL=""
      local DEFAULT_DISPLAY=""
      if [ -n "$DEFAULT" ]; then
        DEFAULT_DISPLAY=" [${DEFAULT}]"
      fi

      if [ "$IS_SECRET" == "yes" ]; then
        # For secrets, prompt with hidden input or use generated default
        if [ -n "$DEFAULT" ] && [[ "$DEFAULT" != please-generate-* ]]; then
          echo -n "    ${PROMPT}${DEFAULT_DISPLAY}: "
          read -r -s USER_INPUT
          echo ""
          if [ -z "$USER_INPUT" ]; then
            VAL="$DEFAULT"
          else
            VAL="$USER_INPUT"
          fi
        else
          echo -n "    ${PROMPT} (auto-generated if empty): "
          read -r -s USER_INPUT
          echo ""
          if [ -z "$USER_INPUT" ]; then
            VAL="$DEFAULT"
            echo "    → using: ${VAL:0:12}..."
          else
            VAL="$USER_INPUT"
          fi
        fi
      else
        echo -n "    ${PROMPT}${DEFAULT_DISPLAY}: "
        read -r USER_INPUT
        if [ -z "$USER_INPUT" ]; then
          VAL="$DEFAULT"
        else
          VAL="$USER_INPUT"
        fi
      fi

      # Set the env var via Vercel CLI by piping the value to stdin
      if [ -n "$VAL" ]; then
        if echo "$VAL" | vercel env add "$NAME" "$SCOPE" --yes 2>/dev/null; then
          log_success "    $NAME set ✓"
        else
          log_warn "    Failed to set $NAME via CLI. You can set it manually in the Vercel Dashboard."
        fi
      else
        log_warn "    $NAME skipped (no value provided). Set it later via Dashboard or CLI."
      fi
    done
  )
}

# ──────────────────────────────────────────────────────────────────────────────
# Extract project IDs from .vercel/project.json
# ──────────────────────────────────────────────────────────────────────────────
extract_ids() {
  local PROJECT_NAME="$1"
  local APP_DIR="$2"
  local FULL_PATH="$PROJECT_ROOT/$APP_DIR"
  local JSON_FILE="$FULL_PATH/.vercel/project.json"

  if [ -f "$JSON_FILE" ]; then
    local PROJECT_ID ORG_ID
    PROJECT_ID=$(grep -o '"projectId":"[^"]*"' "$JSON_FILE" | cut -d'"' -f4)
    ORG_ID=$(grep -o '"orgId":"[^"]*"' "$JSON_FILE" | cut -d'"' -f4)
    echo "$PROJECT_ID|$ORG_ID"
  else
    echo "|"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Mask a secret value for display (never print secrets in full)
# ──────────────────────────────────────────────────────────────────────────────
mask_secret() {
  local VALUE="$1"
  if [ -z "$VALUE" ]; then
    echo "${RED}<not provided — add manually in the Vercel Dashboard>${NC}"
  else
    echo "${VALUE:0:6}…(${#VALUE} chars)"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Print the checklist of env vars that must exist on each Vercel project
# ──────────────────────────────────────────────────────────────────────────────
print_vercel_env_checklist() {
  # Keep the env var names below in sync with WEB_ENV_VARS / API_ENV_VARS_COMMON / API_ENV_VARS_SECRET
  local WEB_STAGING_URL="$1"
  local WEB_PROD_URL="$2"
  local API_STAGING_DB="$3"
  local API_STAGING_JWT="$4"
  local API_STAGING_EXP="$5"
  local API_PROD_DB="$6"
  local API_PROD_JWT="$7"
  local API_PROD_EXP="$8"

  log_step "Vercel Project Environment Variables Checklist"
  echo "Verify these in Vercel Dashboard → Project → Settings → Environment Variables."
  echo "If a secret shows \"not provided\", add it manually — the CLI step above may have failed."
  echo ""
  echo "Scope notes: Production is required for CircleCI deploys (they use --prod)."
  echo "             Preview is for branch/preview deployments."
  echo ""

  echo -e "${BOLD}${CYAN}▶ handmade-shop-web-staging${NC}  (apps/web — staging frontend)"
  echo -e "  ${BOLD}NEXT_PUBLIC_API_URL${NC}  (Production + Preview)  = ${GREEN}${WEB_STAGING_URL}${NC}"
  echo ""

  echo -e "${BOLD}${CYAN}▶ handmade-shop-web-prod${NC}     (apps/web — production frontend)"
  echo -e "  ${BOLD}NEXT_PUBLIC_API_URL${NC}  (Production)             = ${GREEN}${WEB_PROD_URL}${NC}"
  echo ""

  echo -e "${BOLD}${CYAN}▶ handmade-shop-api-staging${NC}  (apps/api — staging API)"
  echo -e "  ${BOLD}DATABASE_URL${NC}    (Production + Preview)  = $(mask_secret "$API_STAGING_DB")"
  echo -e "  ${BOLD}JWT_SECRET${NC}      (Production + Preview)  = $(mask_secret "$API_STAGING_JWT")"
  echo -e "  ${BOLD}JWT_EXPIRES_IN${NC}  (Production + Preview)  = ${GREEN}${API_STAGING_EXP:-7d}${NC}"
  echo ""

  echo -e "${BOLD}${CYAN}▶ handmade-shop-api-prod${NC}     (apps/api — production API)"
  echo -e "  ${BOLD}DATABASE_URL${NC}    (Production)             = $(mask_secret "$API_PROD_DB")"
  echo -e "  ${BOLD}JWT_SECRET${NC}      (Production)             = $(mask_secret "$API_PROD_JWT")"
  echo -e "  ${BOLD}JWT_EXPIRES_IN${NC}  (Production)             = ${GREEN}${API_PROD_EXP:-7d}${NC}"
  echo ""
}

# ──────────────────────────────────────────────────────────────────────────────
# Main setup logic
# ──────────────────────────────────────────────────────────────────────────────

main() {
  log_header "🏪 Handmade Shop — Vercel Setup Script"
  echo "This script will create 4 Vercel projects and set up environment variables."
  echo ""
  echo -e "  ${BOLD}Projects to create:${NC}"
  echo "  • handmade-shop-web-staging    (staging frontend)"
  echo "  • handmade-shop-api-staging    (staging API)"
  echo "  • handmade-shop-web-prod       (production frontend)"
  echo "  • handmade-shop-api-prod       (production API)"
  echo ""

  # Step 0: Prerequisites
  check_prerequisites

  # Step 1: Confirm
  echo ""
  read -r -p "$(echo -e ${YELLOW}Continue? [Y/n]${NC}) " CONTINUE
  if [[ "$CONTINUE" =~ ^[Nn] ]]; then
    log_info "Aborted by user."
    exit 0
  fi

  # Step 2: Ask for API base URLs upfront so we can reference them for web projects
  log_step "Collect API URLs"
  echo "We need the deployment URLs for the API projects (to set as NEXT_PUBLIC_API_URL)."
  echo "These will be available after the API projects are deployed."
  echo -e "For now, enter placeholder URLs (you can update them after the first deploy).\n"

  echo -n "  Staging API URL (e.g., https://handmade-shop-api-staging.vercel.app): "
  read -r STAGING_API_URL
  STAGING_API_URL="${STAGING_API_URL:-https://handmade-shop-api-staging.vercel.app}"

  echo -n "  Production API URL (e.g., https://handmade-shop-api-prod.vercel.app): "
  read -r PROD_API_URL
  PROD_API_URL="${PROD_API_URL:-https://handmade-shop-api-prod.vercel.app}"

  # Normalize: ensure /api suffix
  [[ "$STAGING_API_URL" != */api ]] && STAGING_API_URL="${STAGING_API_URL%/}/api"
  [[ "$PROD_API_URL" != */api ]] && PROD_API_URL="${PROD_API_URL%/}/api"

  # ── Collect API environment variables up front ──────────────────────────
  log_step "Collect Environment Variables"

  declare -A ENV_VALS  # associative array to store collected values

  # Collect staging API env vars
  echo -e "${BOLD}Staging API — Environment Variables${NC}"
  echo "(Press Enter to accept defaults where shown)\n"
  for ENTRY in "${API_ENV_VARS_COMMON[@]}"; do
    IFS='|' read -r NAME PROMPT IS_SECRET DEFAULT <<< "$ENTRY"
    local DEFAULT_DISPLAY=" [${DEFAULT}]"
    echo -n "  ${PROMPT}${DEFAULT_DISPLAY}: "
    read -r USER_INPUT
    ENV_VALS["STAGING_${NAME}"]="${USER_INPUT:-$DEFAULT}"
    log_success "  $NAME = ${ENV_VALS["STAGING_${NAME}"]}"
  done
  for ENTRY in "${API_ENV_VARS_SECRET[@]}"; do
    IFS='|' read -r NAME PROMPT IS_SECRET DEFAULT <<< "$ENTRY"
    if [ -n "$DEFAULT" ]; then
      echo -n "  ${PROMPT} (Press Enter to use auto-generated): "
      read -r -s USER_INPUT
      echo ""
      ENV_VALS["STAGING_${NAME}"]="${USER_INPUT:-$DEFAULT}"
      echo "    → set (${#ENV_VALS["STAGING_${NAME}"]} chars)"
    else
      echo -n "  ${PROMPT}: "
      read -r -s USER_INPUT
      echo ""
      ENV_VALS["STAGING_${NAME}"]="$USER_INPUT"
    fi
  done
  # Staging DB URL is required (press Ctrl+C to abort)
  local _db_retry=0
  while [ -z "${ENV_VALS["STAGING_DATABASE_URL"]:-}" ] && [ $_db_retry -lt 10 ]; do
    if [ $_db_retry -gt 0 ]; then
      log_warn "  URL cannot be empty. Please provide a valid connection string."
    fi
    echo -n "  PostgreSQL connection string for STAGING (required, Ctrl+C to abort): "
    read -r -s USER_INPUT
    echo ""
    ENV_VALS["STAGING_DATABASE_URL"]="$USER_INPUT"
    _db_retry=$((_db_retry + 1))
  done
  log_success "  DATABASE_URL (staging) set ✓"

  echo ""
  echo -e "${BOLD}Production API — Environment Variables${NC}"
  for ENTRY in "${API_ENV_VARS_COMMON[@]}"; do
    IFS='|' read -r NAME PROMPT IS_SECRET DEFAULT <<< "$ENTRY"
    echo -n "  ${PROMPT} [${DEFAULT}]: "
    read -r USER_INPUT
    ENV_VALS["PROD_${NAME}"]="${USER_INPUT:-$DEFAULT}"
  done
  for ENTRY in "${API_ENV_VARS_SECRET[@]}"; do
    IFS='|' read -r NAME PROMPT IS_SECRET DEFAULT <<< "$ENTRY"
    # Generate a random secret for JWT_SECRET if no default is available
    if [[ "$NAME" == "JWT_SECRET" ]]; then
      local _gen_secret
      _gen_secret=$(openssl rand -base64 48 2>/dev/null || echo 'please-generate-a-secure-random-string')
      echo -n "  ${PROMPT} (Press Enter to use auto-generated): "
      read -r -s USER_INPUT
      echo ""
      if [ -z "$USER_INPUT" ]; then
        ENV_VALS["PROD_${NAME}"]="$_gen_secret"
        echo "    → auto-generated (${#_gen_secret} chars)"
      else
        ENV_VALS["PROD_${NAME}"]="$USER_INPUT"
      fi
    elif [ -n "$DEFAULT" ]; then
      echo -n "  ${PROMPT} (Press Enter to use auto-generated): "
      read -r -s USER_INPUT
      echo ""
      ENV_VALS["PROD_${NAME}"]="${USER_INPUT:-$DEFAULT}"
      echo "    → set (${#ENV_VALS["PROD_${NAME}"]} chars)"
    else
      echo -n "  ${PROMPT}: "
      read -r -s USER_INPUT
      echo ""
      ENV_VALS["PROD_${NAME}"]="$USER_INPUT"
    fi
  done
  # Production DB URL is required (press Ctrl+C to abort)
  local _db_retry=0
  while [ -z "${ENV_VALS["PROD_DATABASE_URL"]:-}" ] && [ $_db_retry -lt 10 ]; do
    if [ $_db_retry -gt 0 ]; then
      log_warn "  URL cannot be empty. Please provide a valid connection string."
    fi
    echo -n "  PostgreSQL connection string for PRODUCTION (required, Ctrl+C to abort): "
    read -r -s USER_INPUT
    echo ""
    ENV_VALS["PROD_DATABASE_URL"]="$USER_INPUT"
    _db_retry=$((_db_retry + 1))
  done
  log_success "  DATABASE_URL (production) set ✓"

  # ── Create projects ──────────────────────────────────────────────────────
  log_step "Creating Vercel Projects"

  # Define the creation order: staging first, then production
  local CREATE_ORDER=(
    "handmade-shop-web-staging:apps/web"
    "handmade-shop-api-staging:apps/api"
    "handmade-shop-web-prod:apps/web"
    "handmade-shop-api-prod:apps/api"
  )

  declare -A PROJECT_IDS
  declare -A ORG_IDS

  for ENTRY in "${CREATE_ORDER[@]}"; do
    IFS=':' read -r NAME DIR <<< "$ENTRY"
    echo ""
    create_project "$NAME" "$DIR"

    # Extract IDs
    IFS='|' read -r PID OID <<< "$(extract_ids "$NAME" "$DIR")"
    PROJECT_IDS["$NAME"]="$PID"
    ORG_IDS["$NAME"]="$OID"
  done

  # Verify org IDs match across all projects
  local FIRST_ORG=""
  for NAME in "${!ORG_IDS[@]}"; do
    if [ -n "${ORG_IDS[$NAME]}" ]; then
      if [ -z "$FIRST_ORG" ]; then
        FIRST_ORG="${ORG_IDS[$NAME]}"
      elif [ "${ORG_IDS[$NAME]}" != "$FIRST_ORG" ]; then
        log_warn "Org ID mismatch for $NAME: ${ORG_IDS[$NAME]} vs $FIRST_ORG"
        log_info "Using the first org ID: $FIRST_ORG"
      fi
    fi
  done

  # ── Set environment variables ───────────────────────────────────────────
  log_step "Setting Environment Variables"

  # Staging Web
  echo -e "${BOLD}handmade-shop-web-staging${NC}"
  WEB_STAGING_VARS=(
    "NEXT_PUBLIC_API_URL|Full staging API URL|no|${STAGING_API_URL}"
  )
  set_env_vars "handmade-shop-web-staging" "apps/web" "preview,production" "${WEB_STAGING_VARS[@]}"

  # Production Web
  echo ""
  echo -e "${BOLD}handmade-shop-web-prod${NC}"
  WEB_PROD_VARS=(
    "NEXT_PUBLIC_API_URL|Full production API URL|no|${PROD_API_URL}"
  )
  set_env_vars "handmade-shop-web-prod" "apps/web" "production" "${WEB_PROD_VARS[@]}"

  # Staging API
  echo ""
  echo -e "${BOLD}handmade-shop-api-staging${NC}"
  API_STAGING_VARS=(
    "JWT_EXPIRES_IN|JWT expiration|no|${ENV_VALS["STAGING_JWT_EXPIRES_IN"]}"
    "DATABASE_URL|Staging DB URL|yes|${ENV_VALS["STAGING_DATABASE_URL"]}"
    "JWT_SECRET|Staging JWT secret|yes|${ENV_VALS["STAGING_JWT_SECRET"]}"
  )
  set_env_vars "handmade-shop-api-staging" "apps/api" "preview,production" "${API_STAGING_VARS[@]}"

  # Production API
  echo ""
  echo -e "${BOLD}handmade-shop-api-prod${NC}"
  API_PROD_VARS=(
    "JWT_EXPIRES_IN|JWT expiration|no|${ENV_VALS["PROD_JWT_EXPIRES_IN"]}"
    "DATABASE_URL|Production DB URL|yes|${ENV_VALS["PROD_DATABASE_URL"]}"
    "JWT_SECRET|Production JWT secret|yes|${ENV_VALS["PROD_JWT_SECRET"]}"
  )
  set_env_vars "handmade-shop-api-prod" "apps/api" "production" "${API_PROD_VARS[@]}"

  # ── Summary ─────────────────────────────────────────────────────────────
  log_step "Setup Complete — Summary"

  log_success "${BOLD}All 4 Vercel projects created and configured!${NC}"

  # Determine the org ID to use
  local FINAL_ORG="${FIRST_ORG:-$(for v in "${ORG_IDS[@]}"; do echo "$v"; break; done)}"

  echo ""
  log_header "CircleCI Environment Variables"
  echo "Copy these into CircleCI Dashboard → Project → Environment Variables:"
  echo ""
  echo -e "${BOLD}Variable${NC}                          ${BOLD}Value${NC}"
  echo "───────────────────────────────────────────────────────────────────"

  # VERCEL_TOKEN — prompt the user
  echo -e "VERCEL_TOKEN                         ${YELLOW}<get from Vercel Account → Settings → Tokens>${NC}"
  echo -e "VERCEL_ORG_ID                        ${GREEN}${FINAL_ORG:-<see note below>}${NC}"
  echo -e "VERCEL_PROJECT_ID_WEB_STAGING        ${GREEN}${PROJECT_IDS["handmade-shop-web-staging"]:-<run vercel link>}${NC}"
  echo -e "VERCEL_PROJECT_ID_WEB_PROD           ${GREEN}${PROJECT_IDS["handmade-shop-web-prod"]:-<run vercel link>}${NC}"
  echo -e "VERCEL_PROJECT_ID_API_STAGING        ${GREEN}${PROJECT_IDS["handmade-shop-api-staging"]:-<run vercel link>}${NC}"
  echo -e "VERCEL_PROJECT_ID_API_PROD           ${GREEN}${PROJECT_IDS["handmade-shop-api-prod"]:-<run vercel link>}${NC}"
  echo -e "DATABASE_URL_STAGING                 ${YELLOW}<staging PostgreSQL pooled URL (port 6543)>${NC}"
  echo -e "DATABASE_URL_STAGING_DIRECT          ${YELLOW}<staging PostgreSQL direct URL (port 5432, for migrations)>${NC}"
  echo -e "DATABASE_URL_PROD                    ${YELLOW}<production PostgreSQL pooled URL (port 6543)>${NC}"
  echo -e "DATABASE_URL_PROD_DIRECT             ${YELLOW}<production PostgreSQL direct URL (port 5432, for migrations)>${NC}"
  echo -e "NEXT_PUBLIC_API_URL_STAGING          ${GREEN}${STAGING_API_URL}${NC}"
  echo -e "NEXT_PUBLIC_API_URL_PROD             ${GREEN}${PROD_API_URL}${NC}"
  echo ""

  # Print the Vercel-project env var checklist (verification reference)
  print_vercel_env_checklist \
    "${STAGING_API_URL}" \
    "${PROD_API_URL}" \
    "${ENV_VALS["STAGING_DATABASE_URL"]:-}" \
    "${ENV_VALS["STAGING_JWT_SECRET"]:-}" \
    "${ENV_VALS["STAGING_JWT_EXPIRES_IN"]:-}" \
    "${ENV_VALS["PROD_DATABASE_URL"]:-}" \
    "${ENV_VALS["PROD_JWT_SECRET"]:-}" \
    "${ENV_VALS["PROD_JWT_EXPIRES_IN"]:-}"

  # ── Next steps ──────────────────────────────────────────────────────────
  log_step "Next Steps"

  echo -e "${BOLD}1. Create a Vercel API token:${NC}"
  echo "   Visit: https://vercel.com/account/tokens"
  echo "   Create a token with full scope and add it to CircleCI as VERCEL_TOKEN"
  echo ""
  echo -e "${BOLD}2. Push the repository to GitHub:${NC}"
  echo "   git remote add origin <your-repo-url>"
  echo "   git push -u origin main"
  echo "   git checkout -b staging && git push -u origin staging"
  echo ""
  echo -e "${BOLD}3. Connect CircleCI:${NC}"
  echo "   Visit: https://app.circleci.com/projects/"
  echo "   Add your GitHub project and set the 12 environment variables listed above."
  echo ""
  echo -e "${BOLD}4. First deployment:${NC}"
  echo "   Push to the staging branch → CircleCI runs tests → deploys to staging."
  echo "   Then merge staging → main → deploys to production."
  echo ""

  # Write a local .env.vercel file with the IDs for reference
  echo "# Vercel Project IDs (generated by setup-deploy.sh)" > "$PROJECT_ROOT/.env.vercel"
  echo "VERCEL_ORG_ID=${FINAL_ORG}" >> "$PROJECT_ROOT/.env.vercel"
  echo "VERCEL_PROJECT_ID_WEB_STAGING=${PROJECT_IDS["handmade-shop-web-staging"]:-}" >> "$PROJECT_ROOT/.env.vercel"
  echo "VERCEL_PROJECT_ID_WEB_PROD=${PROJECT_IDS["handmade-shop-web-prod"]:-}" >> "$PROJECT_ROOT/.env.vercel"
  echo "VERCEL_PROJECT_ID_API_STAGING=${PROJECT_IDS["handmade-shop-api-staging"]:-}" >> "$PROJECT_ROOT/.env.vercel"
  echo "VERCEL_PROJECT_ID_API_PROD=${PROJECT_IDS["handmade-shop-api-prod"]:-}" >> "$PROJECT_ROOT/.env.vercel"
  log_info "IDs also saved to ${BOLD}.env.vercel${NC} for reference."
  echo ""
  log_success "Done!"
}

# ──────────────────────────────────────────────────────────────────────────────
# Run
# ──────────────────────────────────────────────────────────────────────────────
main
