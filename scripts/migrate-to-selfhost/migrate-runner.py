#!/usr/bin/env python3
# ============================================================
# OpenHR — helper behind the https://openhrapp.com/db-migrate page.
#
# A browser cannot reach Postgres, so the page sends commands to this small
# server on the OCI machine, and this server runs db-copy.sh and storage-copy.mjs.
# It can also copy everything back to Supabase Cloud (the "revert" action).
# It runs only the fixed actions listed in ACTIONS and needs no install (Python
# standard library). Start it only for the migration, then stop it:
#
#   cd ~/OpenHRApp && git pull
#   python3 scripts/migrate-to-selfhost/migrate-runner.py
#
# It prints the access token and the Nginx Proxy Manager setting. Pro credentials
# come from the page with each command and stay in memory only. Closing PuTTY does
# not stop it. It stops itself after 6 idle hours.
# ============================================================
import hmac
import json
import os
import platform
import re
import secrets
import shutil
import signal
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get('RUNNER_PORT', '8787'))
ALLOWED_ORIGINS = {'https://openhrapp.com', 'https://www.openhrapp.com'}
if os.environ.get('RUNNER_EXTRA_ORIGIN'):
    ALLOWED_ORIGINS.add(os.environ['RUNNER_EXTRA_ORIGIN'])
IDLE_LIMIT_SECONDS = 6 * 3600

HOME = Path.home()
PROJECT = Path(os.environ.get('SUPABASE_PROJECT', HOME / 'supabase-project'))
SCRIPTS = Path(__file__).resolve().parent
WORK = Path(os.environ.get('RUNNER_WORK', HOME / 'openhr-migration'))
STORAGE_DIR = Path(os.environ.get('RUNNER_STORAGE_DIR', HOME / 'openhr-storage'))
LOCK_FILE = WORK / 'CUTOVER_DONE'
STATE_FILE = WORK / 'runner-state.json'
CLI_DIR = HOME / '.local' / 'bin'

TOKEN = secrets.token_urlsafe(32)
mutex = threading.Lock()
log_lines = []
job = {'name': None, 'running': False, 'exit': None, 'started': None}
secret_values = set()
last_activity = time.time()


class BadRequest(Exception):
    pass


# ---------- Credentials ----------

class ProCredentials:
    def __init__(self, raw_url, service_key):
        m = re.match(r'^postgres(?:ql)?://([^:/@\s]+):(.+)@([A-Za-z0-9.-]+):(\d+)/([A-Za-z0-9_]+)(\?\S*)?$',
                     (raw_url or '').strip())
        if not m:
            raise BadRequest('The Pro database address is not valid. Copy the Session pooler URI from the '
                             'Pro dashboard (Connect button).')
        self.user, password, self.host, self.port, self.database, query = m.groups()
        if '[YOUR-PASSWORD]' in password:
            raise BadRequest('Replace [YOUR-PASSWORD] in the address with the Pro database password.')
        if not self.host.endswith(('.supabase.com', '.supabase.co')):
            raise BadRequest('The address must point at Supabase (a host ending in supabase.com or supabase.co).')
        if self.port != '5432':
            raise BadRequest('Use the Session pooler address (port 5432). Port 6543 cannot run a dump.')
        if self.user.startswith('postgres.'):
            self.ref = self.user.split('.', 1)[1]
        else:
            ref = re.match(r'^db\.([a-z0-9]+)\.supabase\.co$', self.host)
            if not ref:
                raise BadRequest('Cannot find the project ref in the address. Use the Session pooler address.')
            self.ref = ref.group(1)
        # Encode the password, so a password with @ or # still works in the URL.
        self.password = urllib.parse.unquote(password)
        encoded = urllib.parse.quote(self.password, safe='')
        self.url = 'postgresql://%s:%s@%s:%s/%s%s' % (self.user, encoded, self.host, self.port, self.database,
                                                      query or '')
        self.service_key = (service_key or '').strip()
        if not re.match(r'^[A-Za-z0-9._-]{20,}$', self.service_key):
            raise BadRequest('The Pro service_role key is not valid.')
        self.api_url = 'https://%s.supabase.co' % self.ref
        secret_values.update({self.password, encoded, self.url, self.service_key})


# ---------- Logging and state ----------

def redact(text):
    text = re.sub(r'(postgres(?:ql)?://[^:/@\s]+:)[^@\s]+@', r'\1***@', text)
    for value in secret_values:
        if value:
            text = text.replace(value, '***')
    return text


def log(text):
    text = redact(text)
    with mutex:
        log_lines.append(text)
    with open(str(WORK / 'runner.log'), 'a', encoding='utf-8') as f:
        f.write(time.strftime('%Y-%m-%d %H:%M:%S ') + text + '\n')


def read_state():
    try:
        return json.loads(STATE_FILE.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def save_state(key, value):
    state = read_state()
    state[key] = dict(value, at=time.strftime('%Y-%m-%d %H:%M:%S %Z'))
    STATE_FILE.write_text(json.dumps(state), encoding='utf-8')


def env_value(name):
    # The last line wins, the same as db-copy.sh.
    try:
        lines = (PROJECT / '.env').read_text(encoding='utf-8', errors='replace').splitlines()
    except OSError:
        return ''
    value = ''
    for line in lines:
        if line.startswith(name + '='):
            value = line.split('=', 1)[1].strip()
    return value[1:-1] if len(value) > 1 and value[0] == '"' and value[-1] == '"' else value


# ---------- Commands ----------

def child_env(extra=None):
    env = dict(os.environ)
    env['PATH'] = str(CLI_DIR) + os.pathsep + env.get('PATH', '')
    env.update(extra or {})
    return env


def stream(args, env=None, cwd=None):
    """Run a command and send its output to the log. Returns the exit code."""
    proc = subprocess.Popen(args, env=child_env(env), cwd=str(cwd) if cwd else None, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True,
                            errors='replace')
    for line in proc.stdout:
        log(line.rstrip())
    return proc.wait()


def capture(args, env=None, timeout=120):
    try:
        done = subprocess.run(args, env=child_env(env), stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, universal_newlines=True, errors='replace', timeout=timeout)
    except subprocess.TimeoutExpired:
        return 1, 'timed out'
    except OSError as e:
        return 1, str(e)
    return done.returncode, done.stdout.strip()


def target_sql(sql):
    return capture(['docker', 'exec', '-e', 'PGPASSWORD', 'supabase-db', 'psql', '-h', '127.0.0.1', '-U',
                    'supabase_admin', '-d', 'postgres', '-X', '-q', '-At', '-c', sql],
                   {'PGPASSWORD': env_value('POSTGRES_PASSWORD')})


def pro_docker(pro, command, docker_args=()):
    # Credentials go through the environment, so they are not in the process list.
    env = {'PGHOST': pro.host, 'PGPORT': pro.port, 'PGUSER': pro.user, 'PGPASSWORD': pro.password,
           'PGDATABASE': pro.database, 'PGSSLMODE': 'require'}
    args = ['docker', 'run', '--rm'] + list(docker_args)
    for name in env:
        args += ['-e', name]
    return args + ['postgres:17'] + command, env


def pro_sql(pro, sql):
    args, env = pro_docker(pro, ['psql', '-X', '-q', '-At', '-c', sql])
    return capture(args, env, timeout=300)


def target_table_count():
    rc, out = target_sql("select count(*) from pg_tables where schemaname='public'")
    if rc != 0 or not out.strip().isdigit():
        raise BadRequest('Cannot read the self-hosted database: ' + redact(out))
    return int(out.strip())


def ensure_cli():
    if shutil.which('supabase', path=child_env()['PATH']):
        return True
    rc, arch = capture(['dpkg', '--print-architecture'])
    if rc != 0:
        arch = {'x86_64': 'amd64', 'aarch64': 'arm64'}.get(platform.machine(), platform.machine())
    log('Installing the Supabase CLI in ' + str(CLI_DIR))
    CLI_DIR.mkdir(parents=True, exist_ok=True)
    archive = str(WORK / 'supabase-cli.tar.gz')
    url = 'https://github.com/supabase/cli/releases/latest/download/supabase_linux_%s.tar.gz' % arch.strip()
    return (stream(['curl', '-fsSL', '-o', archive, url]) == 0
            and stream(['tar', '-xzf', archive, '-C', str(CLI_DIR), 'supabase']) == 0)


def backup_target():
    """Dump the self-hosted public and auth schemas before they are replaced. Keeps the newest 3."""
    path = WORK / ('backup-before-replace-%s.dump' % time.strftime('%Y%m%d-%H%M%S'))
    log('Backing up the current self-hosted data to ' + str(path))
    with open(str(path), 'wb') as out:
        done = subprocess.run(['docker', 'exec', '-e', 'PGPASSWORD', 'supabase-db', 'pg_dump', '-h', '127.0.0.1',
                               '-U', 'supabase_admin', '-d', 'postgres', '-Fc', '-n', 'public', '-n', 'auth'],
                              env=child_env({'PGPASSWORD': env_value('POSTGRES_PASSWORD')}),
                              stdin=subprocess.DEVNULL, stdout=out, stderr=subprocess.PIPE)
    if done.returncode != 0:
        path.unlink()
        log('Backup failed: ' + done.stderr.decode('utf-8', 'replace'))
        return False
    for old in sorted(WORK.glob('backup-before-replace-*.dump'))[:-3]:
        old.unlink()
    return True


def copy_database(pro, enable_cron):
    tables = target_table_count()
    mode = 'data' if tables else 'full'
    if mode == 'data' and not backup_target():
        return 1
    if not ensure_cli():
        log('Could not install the Supabase CLI.')
        return 1
    extra = {'SRC_DB_URL': pro.url, 'WORK': str(WORK)}
    if enable_cron:
        extra['ENABLE_CRON'] = 'yes'
    rc = stream(['bash', str(SCRIPTS / 'db-copy.sh'), mode], extra, PROJECT)
    save_state('db', {'exit': rc, 'mode': mode, 'cron_active': enable_cron})
    return rc


def copy_storage(pro, to_cloud=False):
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(str(SCRIPTS / 'storage-copy.mjs'), str(STORAGE_DIR / 'storage-copy.mjs'))
    port = env_value('API_GW_HTTP_PORT') or '8100'
    cloud = (pro.api_url, pro.service_key)
    local = ('http://localhost:' + port, env_value('SERVICE_ROLE_KEY'))
    source, target = (local, cloud) if to_cloud else (cloud, local)
    # After the final switch the self-hosted copy of a file may be the newer one.
    only_missing = '1' if LOCK_FILE.exists() and not to_cloud else '0'
    rc = stream(['docker', 'run', '--rm', '--network', 'host', '-v', '%s:/w' % STORAGE_DIR, '-w', '/w',
                 '-e', 'SRC_URL', '-e', 'SRC_SERVICE_KEY', '-e', 'DST_URL', '-e', 'DST_SERVICE_KEY', '-e', 'ONLY_MISSING', 'node:20',
                 'sh', '-c', 'npm i --silent @supabase/supabase-js@2 && node storage-copy.mjs'],
                {'SRC_URL': source[0], 'SRC_SERVICE_KEY': source[1], 'DST_URL': target[0], 'DST_SERVICE_KEY': target[1],
                 'ONLY_MISSING': only_missing})
    if not to_cloud:
        save_state('storage', {'exit': rc})
    return rc


def cloud_api_status(pro):
    """HTTP status of the Cloud Storage API. 402 means that Supabase has restricted the project."""
    request = urllib.request.Request(pro.api_url + '/storage/v1/bucket', headers={
        'apikey': pro.service_key, 'Authorization': 'Bearer ' + pro.service_key})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status if hasattr(response, 'status') else 200
    except urllib.error.HTTPError as e:
        return e.code
    except urllib.error.URLError:
        return 0


def set_pro_cron(pro, active):
    rc, out = pro_sql(pro, 'select cron.alter_job(jobid, active := %s) from cron.job' % ('true' if active else 'false'))
    log('Pro cron jobs: %s.' % ('active' if active else 'paused') if rc == 0
        else 'WARNING: could not change the Pro cron jobs: ' + out)
    return rc == 0


def set_target_cron(active):
    rc, _ = target_sql('select cron.alter_job(jobid, active := %s) from cron.job' % ('true' if active else 'false'))
    if rc == 0:
        log('Self-hosted cron jobs: %s.' % ('active' if active else 'paused'))
    else:
        log('Self-hosted database has no cron jobs to change.')


# ---------- Actions ----------

def go_live_gaps():
    """What must be on the server before real users move to it."""
    gaps = []
    if not env_value('CRON_SECRET'):
        gaps.append('CRON_SECRET is missing in .env (MIGRATE-DATA.md step A4)')
    if not env_value('RESEND_API_KEY'):
        gaps.append('RESEND_API_KEY is missing in .env (step A4)')
    if not (PROJECT / 'volumes' / 'functions' / 'cron-auto-close-sessions').is_dir():
        gaps.append('the OpenHR Edge Functions are not installed (step A6)')
    return gaps


def action_check(pro, _):
    items = []
    facts = {}

    def add(status, name, detail=''):
        items.append({'status': status, 'name': name, 'detail': redact(detail)})
        log('[%s] %s%s' % (status.upper(), name, ': ' + redact(detail) if detail else ''))

    def finish():
        save_state('check', {'items': items, 'facts': facts})
        return 1 if any(i['status'] == 'fail' for i in items) else 0

    rc, out = capture(['docker', 'version', '--format', '{{.Server.Version}}'])
    if rc != 0:
        add('fail', 'Docker', 'This user cannot run Docker: ' + out)
        return finish()
    add('ok', 'Docker', out)

    if not (PROJECT / '.env').is_file():
        add('fail', 'Supabase project', 'No .env file in %s' % PROJECT)
        return finish()
    env_text = (PROJECT / '.env').read_text(encoding='utf-8', errors='replace')
    if re.search(r'supabase-demo|dc_X5iR_VP_qT0zsiyj|DaYlNEoUrrEn2Ig7|your-super-secret|this_password_is_insecure',
                 env_text):
        add('fail', 'Secrets in .env', 'Example values are still in .env. See OCI-SETUP.md step 5.')
    else:
        add('ok', 'Secrets in .env', 'No example values')

    rc, out = target_sql("select current_setting('server_version_num'), "
                         "(select count(*) from pg_tables where schemaname='public'), "
                         "(select count(*) from auth.users)")
    target_major = None
    if rc != 0:
        add('fail', 'Self-hosted database', out)
    else:
        version, tables, users = out.split('|')
        target_major = int(version[:2])
        facts.update(target_public_tables=int(tables), target_users=int(users))
        add('ok', 'Self-hosted database', 'Postgres %d, %s tables in public, %s users' % (target_major, tables, users))

    rc, out = pro_sql(pro, "select current_setting('server_version_num'), pg_database_size(current_database()), "
                           "(select count(*) from pg_tables where schemaname='public'), "
                           "(select count(*) from auth.users), (select count(*) from cron.job), "
                           "(select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects)")
    if rc != 0:
        add('fail', 'Pro database', 'Cannot connect. Check that the project is not paused, and check the password. '
                                    + out)
    else:
        version, size, tables, users, jobs, files = out.split('|')
        src_major = int(version[:2])
        facts.update(src_db_bytes=int(size), src_public_tables=int(tables), src_users=int(users),
                     src_cron_jobs=int(jobs), src_file_bytes=int(files))
        add('ok', 'Pro database', 'Postgres %d, %.0f MB, %s tables, %s users, %s cron jobs, %.0f MB of files'
            % (src_major, int(size) / 1e6, tables, users, jobs, int(files) / 1e6))
        if target_major is not None and target_major < src_major:
            add('fail', 'Postgres version', 'The self-hosted server is older than Pro. Update it first.')
        free = shutil.disk_usage(str(WORK)).free
        needed = 3 * int(size) + int(files)
        add('ok' if free > needed else 'fail', 'Disk space', '%.1f GB free, about %.1f GB needed' % (free / 1e9, needed / 1e9))

    add('ok', 'Supabase CLI') if ensure_cli() else add('fail', 'Supabase CLI', 'Could not install it. See step A2.')

    api_status = cloud_api_status(pro)
    if api_status == 200:
        add('ok', 'Pro files (Storage API)', 'The service_role key works')
    elif api_status == 402:
        add('warn', 'Pro files (Storage API)', 'Supabase has restricted this project (over quota), so files cannot '
                                               'be copied until the restriction is lifted. The database copy can '
                                               'still run if the Pro database check above passed.')
    else:
        add('fail', 'Pro files (Storage API)', 'It refused the service_role key (status %s).' % api_status)

    gaps = go_live_gaps()
    if gaps:
        add('warn', 'Needed before the final switch', '; '.join(gaps))
    else:
        add('ok', 'Edge Functions and secrets', 'Installed')
    if env_value('FUNCTIONS_VERIFY_JWT').lower() != 'false':
        add('warn', 'FUNCTIONS_VERIFY_JWT', 'Set it to false in .env. Cron jobs call functions without a login.')
    return finish()


def action_db(pro, _):
    return copy_database(pro, enable_cron=False)


def action_storage(pro, _):
    return copy_storage(pro)


def action_cutover(pro, _):
    gaps = go_live_gaps()
    if gaps:
        log('Stopped. Nothing changed. Fix this first: ' + '; '.join(gaps))
        return 1
    log('== Pause the Pro cron jobs')
    set_pro_cron(pro, False)
    log('== Copy the database')
    rc = copy_database(pro, enable_cron=True)
    if rc not in (0, 2):
        log('The copy failed. Restoring cron on Pro, so the live app keeps working.')
        set_pro_cron(pro, True)
        set_target_cron(False)
        save_state('cutover', {'exit': rc, 'stage': 'failed'})
        return rc
    log('== Copy the files')
    storage_rc = copy_storage(pro)
    result = rc or storage_rc
    if result == 0:
        LOCK_FILE.write_text(time.strftime('%Y-%m-%d %H:%M:%S\n'), encoding='utf-8')
        log('Copy finished and verified. Further copies are now locked, to protect live data.')
    else:
        log('The copy finished with differences. Read them above, then accept or run the final copy again.')
    save_state('cutover', {'exit': result, 'stage': 'copied' if result == 0 else 'review'})
    return result


def action_accept(_pro, _):
    LOCK_FILE.write_text(time.strftime('%Y-%m-%d %H:%M:%S\n'), encoding='utf-8')
    save_state('cutover', {'exit': 0, 'stage': 'copied'})
    log('Differences accepted. Further copies are now locked, to protect live data.')
    return 0


def action_rollback(pro, _):
    log('Rollback: cron jobs back on Pro, paused here. Data entered on this server stays here.')
    ok = set_pro_cron(pro, True)
    set_target_cron(False)
    if LOCK_FILE.exists():
        LOCK_FILE.unlink()
    save_state('cutover', {'exit': 0, 'stage': 'rolled_back'})
    return 0 if ok else 1


# ---------- Revert: self-hosted back to Supabase Cloud ----------

COLUMNS_SQL = ("""select n.nspname||'.'||c.relname||'.'||a.attname from pg_attribute a
    join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth') and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
    and c.relname <> 'schema_migrations' and a.attgenerated = '' order by 1""")
COUNTS_SQL = ("""select n.nspname||'.'||c.relname||' '||(xpath('/row/n/text()',
    query_to_xml(format('select count(*) as n from %I.%I',n.nspname,c.relname),false,true,'')))[1]::text
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth') and c.relkind in ('r','p')
    and c.relname not in ('schema_migrations','audit_log_entries') order by 1""")
TRUNCATE_SQL = ("""select 'truncate table '||string_agg(format('%I.%I',schemaname,tablename),', ')||' restart identity cascade;'
    from pg_tables where schemaname in ('public','auth') and tablename <> 'schema_migrations'""")
CLOUD_ACCESS_SQL = ("""select count(*) from pg_tables where schemaname in ('public','auth')
    and tablename <> 'schema_migrations'
    and not (has_table_privilege(format('%I.%I',schemaname,tablename),'TRUNCATE')
             and has_table_privilege(format('%I.%I',schemaname,tablename),'INSERT'))""")


def revert_blockers(pro):
    """Checks that change nothing. Every problem found here means Cloud was not touched."""
    rc, out = pro_sql(pro, "select count(*) from pg_tables where schemaname='public'")
    if rc != 0:
        return ['Cannot connect to Cloud. If the project is paused, restore it in the dashboard first. ' + out]
    if int(out.strip() or 0) == 0:
        return ['The Cloud project has no OpenHR tables, so this is not the original project. '
                'Restoring into a new project needs the schema first.']
    if cloud_api_status(pro) == 402:
        return ['Supabase still restricts the Cloud project (over quota), so the app could not run there. '
                'Lift the restriction in the Supabase dashboard first.']
    blockers = []
    rc_t, target_cols = target_sql(COLUMNS_SQL)
    rc_p, cloud_cols = pro_sql(pro, COLUMNS_SQL)
    if rc_t != 0 or rc_p != 0:
        return ['Cannot compare the columns: ' + (target_cols if rc_t else cloud_cols)]
    missing = sorted(set(target_cols.splitlines()) - set(cloud_cols.splitlines()))
    if missing:
        blockers.append('These self-hosted columns do not exist on Cloud. Apply the same migration on Cloud, '
                        'or update Cloud Auth: ' + ', '.join(missing))
    rc, out = pro_sql(pro, CLOUD_ACCESS_SQL)
    if rc != 0 or out.strip() != '0':
        blockers.append('The Cloud postgres role cannot replace %s tables. Nothing was changed. '
                        'Send this log to Claude.' % (out.strip() if rc == 0 else 'some'))
    return blockers


def counts_match(pro):
    rc_t, target_counts = target_sql(COUNTS_SQL)
    rc_p, cloud_counts = pro_sql(pro, COUNTS_SQL)
    if rc_t != 0 or rc_p != 0:
        log('Cannot compare row counts: ' + (target_counts if rc_t else cloud_counts))
        return False
    cloud = dict(line.rsplit(' ', 1) for line in cloud_counts.splitlines())
    differences = 0
    for line in target_counts.splitlines():
        table, count = line.rsplit(' ', 1)
        if cloud.get(table) != count:
            differences += 1
            log('   %s: self-hosted %s, Cloud %s' % (table, count, cloud.get(table, 'missing')))
    log('Row counts: %d tables compared, %d different.' % (len(target_counts.splitlines()), differences))
    return differences == 0


def finish_revert():
    # Cloud is live again, so a later forward cutover is allowed.
    if LOCK_FILE.exists():
        LOCK_FILE.unlink()
    save_state('cutover', {'exit': 0, 'stage': 'reverted'})


def action_revert(pro, _):
    log('== 1/6 Checks (nothing changes yet)')
    blockers = revert_blockers(pro)
    if blockers:
        for blocker in blockers:
            log('STOP: ' + blocker)
        log('Cloud was not changed.')
        return 1
    rc, out = target_sql('select pg_database_size(current_database())')
    if rc == 0:
        log('Self-hosted database size: %.0f MB. Check that it fits the limits of the current Cloud plan.'
            % (int(out) / 1e6))

    log('== 2/6 Pause the self-hosted cron jobs')
    set_target_cron(False)

    def stop(message):
        # The app is still on the self-hosted server, so its cron jobs must run again.
        log(message)
        set_target_cron(True)
        save_state('cutover', {'exit': 1, 'stage': 'revert_failed'})
        return 1

    stamp = time.strftime('%Y%m%d-%H%M%S')
    log('== 3/6 Back up Cloud before replacing its data')
    backup_name = 'cloud-backup-before-revert-%s.dump' % stamp
    args, env = pro_docker(pro, ['pg_dump', '--data-only', '-Fc', '-n', 'public', '-n', 'auth',
                                 '-f', '/w/' + backup_name], ['-v', '%s:/w' % WORK])
    if stream(args, env) != 0:
        return stop('The Cloud backup failed. Cloud was not changed.')
    log('Saved %s' % (WORK / backup_name))
    for old in sorted(WORK.glob('cloud-backup-before-revert-*.dump'))[:-3]:
        old.unlink()

    log('== 4/6 Export from the self-hosted database')
    data_name = 'revert-data.sql'
    with open(str(WORK / data_name), 'wb') as out_file:
        done = subprocess.run(['docker', 'exec', '-e', 'PGPASSWORD', 'supabase-db', 'pg_dump', '-h', '127.0.0.1',
                               '-U', 'supabase_admin', '-d', 'postgres', '--data-only', '-n', 'public', '-n', 'auth',
                               '--exclude-table=auth.schema_migrations'],
                              env=child_env({'PGPASSWORD': env_value('POSTGRES_PASSWORD')}),
                              stdin=subprocess.DEVNULL, stdout=out_file, stderr=subprocess.PIPE)
    if done.returncode != 0:
        return stop('The export failed. Cloud was not changed. ' + done.stderr.decode('utf-8', 'replace'))
    rc, truncate = pro_sql(pro, TRUNCATE_SQL)
    if rc != 0:
        return stop('Cannot list the Cloud tables. Cloud was not changed. ' + truncate)
    (WORK / 'revert-truncate.sql').write_text(truncate + '\n', encoding='utf-8')

    log('== 5/6 Restore on Cloud (one transaction: on any error, Cloud stays as it was)')
    args, env = pro_docker(pro, ['psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction',
                                 '-c', 'SET session_replication_role = replica',
                                 '-f', '/w/revert-truncate.sql', '-f', '/w/' + data_name,
                                 '-c', 'SET session_replication_role = origin'], ['-v', '%s:/w:ro' % WORK])
    if stream(args, env) != 0:
        return stop('The restore failed and was undone. Cloud has its old data. The app stays on the self-hosted server.')
    pro_sql(pro, 'analyze')

    log('== 6/6 Copy the files and compare')
    storage_rc = copy_storage(pro, to_cloud=True)
    if not counts_match(pro) or storage_rc != 0:
        log('Copied, with differences or failed files (see above). Run it again at a quiet time, or accept them.')
        set_target_cron(True)
        save_state('cutover', {'exit': 2, 'stage': 'revert_review'})
        return 2
    set_pro_cron(pro, True)
    finish_revert()
    log('Revert copy verified. Now point Vercel back to Cloud and redeploy.')
    return 0


def action_revert_accept(pro, _):
    if read_state().get('cutover', {}).get('stage') != 'revert_review':
        log('There are no revert differences to accept.')
        return 1
    set_target_cron(False)
    set_pro_cron(pro, True)
    finish_revert()
    log('Differences accepted. Now point Vercel back to Cloud and redeploy.')
    return 0


# name -> function, required confirmation word, blocked after cutover
ACTIONS = {
    'check': (action_check, None, False),
    'db': (action_db, None, True),
    'storage': (action_storage, None, False),  # Copies only missing files after the final switch.
    'cutover': (action_cutover, 'CUTOVER', True),
    'accept': (action_accept, 'ACCEPT', True),
    'rollback': (action_rollback, 'ROLLBACK', False),
    'revert': (action_revert, 'REVERT', False),
    'revert_accept': (action_revert_accept, 'ACCEPT', False),
}
# Copying back while the app still runs on Cloud would overwrite live data with an older copy.
NEEDS_CUTOVER = {'revert', 'revert_accept'}


def start_action(body):
    name = body.get('action')
    if name not in ACTIONS:
        raise BadRequest('Unknown action.')
    func, word, blocked_after_cutover = ACTIONS[name]
    if blocked_after_cutover and LOCK_FILE.exists():
        raise BadRequest('Locked: the final copy is done, so this server may hold live data. A new copy would '
                         'replace it. To undo the switch, use Rollback.')
    if name in NEEDS_CUTOVER and not LOCK_FILE.exists():
        raise BadRequest('The app is still on Supabase Cloud (no final switch recorded), so copying back would '
                         'overwrite live data. If you switched without this page, run this on the server first: '
                         'touch %s' % LOCK_FILE)
    if word and body.get('confirm') != word:
        raise BadRequest('Type %s to confirm.' % word)
    pro = ProCredentials(body.get('src_db_url'), body.get('src_service_key'))
    if name == 'db' and target_table_count() > 0 and body.get('confirm') != 'REPLACE':
        raise BadRequest('The self-hosted database already has data. Type REPLACE to confirm.')

    with mutex:
        if job['running']:
            raise BadRequest('Another step is still running.')
        job.update(name=name, running=True, exit=None, started=time.time())

    def work():
        log('')
        log('===== %s started %s =====' % (name, time.strftime('%H:%M:%S')))
        try:
            rc = func(pro, body)
        except Exception as e:  # The page must always see the step finish.
            log('ERROR: %s' % e)
            rc = 1
        log('===== %s finished: exit code %s =====' % (name, rc))
        with mutex:
            job.update(running=False, exit=rc)

    threading.Thread(target=work, daemon=True).start()


# ---------- HTTP ----------

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Nothing is printed after startup: PuTTY may be closed.

    def send_json(self, status, payload):
        data = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def cors(self):
        origin = self.headers.get('Origin')
        if origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header('Access-Control-Allow-Methods', 'GET, POST')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def allowed(self):
        origin = self.headers.get('Origin')
        if origin and origin not in ALLOWED_ORIGINS:
            self.send_json(403, {'error': 'This address may not use the helper.'})
            return False
        sent = self.headers.get('Authorization', '')
        if not hmac.compare_digest(sent.encode('utf-8'), ('Bearer ' + TOKEN).encode('utf-8')):
            self.send_json(401, {'error': 'Wrong token.'})
            return False
        global last_activity
        last_activity = time.time()
        return True

    def endpoint(self):
        # Works with or without the proxy's /db-migrate-runner/ prefix.
        return urllib.parse.urlsplit(self.path).path.rstrip('/').rsplit('/', 1)[-1]

    def do_GET(self):
        if not self.allowed():
            return
        if self.endpoint() != 'status':
            return self.send_json(404, {'error': 'Not found.'})
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        start = int((query.get('from') or ['0'])[0])
        with mutex:
            lines = log_lines[start:start + 2000]
            total = start + len(lines)
            snapshot = dict(job)
        self.send_json(200, {
            'job': snapshot, 'lines': lines, 'next': total, 'state': read_state(), 'locked': LOCK_FILE.exists(),
            'vercel': {'url': env_value('SUPABASE_PUBLIC_URL'), 'anon_key': env_value('ANON_KEY')},
        })

    def do_POST(self):
        if not self.allowed():
            return
        endpoint = self.endpoint()
        if endpoint == 'shutdown':
            if job['running']:
                return self.send_json(400, {'error': 'A step is still running.'})
            self.send_json(200, {'ok': True})
            threading.Timer(0.5, lambda: os._exit(0)).start()
            return
        if endpoint != 'run':
            return self.send_json(404, {'error': 'Not found.'})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length') or 0)).decode('utf-8'))
            start_action(body)
        except ValueError:
            return self.send_json(400, {'error': 'Bad request.'})
        except BadRequest as e:
            return self.send_json(400, {'error': str(e)})
        self.send_json(200, {'ok': True})


def idle_watch():
    while True:
        time.sleep(60)
        if not job['running'] and time.time() - last_activity > IDLE_LIMIT_SECONDS:
            os._exit(0)


def private_ip():
    rc, out = capture(['hostname', '-I'])
    return out.split()[0] if rc == 0 and out.split() else '<private-ip>'


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    os.chmod(str(WORK), 0o700)  # Holds dumps with password hashes.
    if hasattr(signal, 'SIGHUP'):
        signal.signal(signal.SIGHUP, signal.SIG_IGN)  # Survive closing PuTTY. Children inherit this.
    server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    threading.Thread(target=idle_watch, daemon=True).start()
    print("""
OpenHR migration helper is running on port %d.

1. Let Nginx Proxy Manager reach it (only needed once after each server restart):

   sudo iptables -I INPUT 1 -p tcp -s 172.16.0.0/12 --dport %d -j ACCEPT

2. In Nginx Proxy Manager, edit the api.openhrapp.com proxy host, open the Advanced tab,
   add this below anything already there, and save:

   location /db-migrate-runner/ {
       proxy_pass http://%s:%d;
   }

3. Open https://openhrapp.com/db-migrate and paste this token:

   %s

Do not share the token. Do not open port %d in Oracle Cloud.
You can close PuTTY. To stop the helper, use the Stop button on the page.
""" % (PORT, PORT, private_ip(), PORT, TOKEN, PORT), flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
