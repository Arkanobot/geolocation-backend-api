create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'operator' check (role in ('admin', 'operator')),
  phone         text,
  created_at    timestamptz not null default now()
);

create table if not exists vehicles (
  id                  uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  model               text not null,
  status              text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  address             text,
  latitude            double precision check (latitude between -90 and 90),
  longitude           double precision check (longitude between -180 and 180),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists vehicles_lat_lng_idx on vehicles (latitude, longitude);

create table if not exists telemetry (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references vehicles(id) on delete cascade,
  latitude       double precision not null check (latitude between -90 and 90),
  longitude      double precision not null check (longitude between -180 and 180),
  speed          double precision,
  battery_level  integer check (battery_level between 0 and 100),
  engine_fault   boolean not null default false,
  emergency_stop boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists telemetry_vehicle_created_idx on telemetry (vehicle_id, created_at desc);

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete set null,
  recipient  text not null,
  type       text not null check (type in ('ENGINE_FAULT', 'LOW_BATTERY', 'EMERGENCY_STOP', 'STATUS_CHANGE')),
  message    text not null,
  status     text not null check (status in ('sent', 'failed')),
  created_at timestamptz not null default now()
);

-- Supabase exposes public tables through its REST API; RLS with no policies locks that out.
-- The backend connects as the postgres role, which bypasses RLS, so it's unaffected.
alter table users         enable row level security;
alter table vehicles      enable row level security;
alter table telemetry     enable row level security;
alter table notifications enable row level security;