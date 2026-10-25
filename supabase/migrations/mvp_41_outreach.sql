-- mvp_41 · Contatti dei moltiplicatori e stato degli invii (decisione di Andrea del 25/10/2026: «falle partire senza mio ok»).
-- Solo indirizzi pubblicati dagli enti sulle loro pagine ufficiali (outreach/contatti-*.csv nel repository dei post).
-- Schema maint: non esposto alle API pubbliche, lo usano solo le automazioni con execute_sql.
create table if not exists maint.outreach (
  id bigserial primary key,
  kind text not null check (kind in ('eurodesk', 'scuola', 'media', 'ente', 'associazione')),
  ente text not null,
  emails text[] not null,
  city text,
  region text,
  source_url text not null,
  status text not null default 'da_inviare' check (status in ('da_inviare', 'inviata', 'rimbalzata', 'risposta', 'esclusa')),
  priority smallint not null default 5,
  sent_at timestamptz,
  thread_id text,
  replied_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists outreach_emails_key on maint.outreach ((emails[1]));
alter table maint.outreach enable row level security;
revoke all on maint.outreach from anon, authenticated;
