-- Add wishlist-scoped presentation themes. Existing wishlists remain Classic.

begin;

alter table public.wishlists
  add column if not exists theme text not null default 'classic';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wishlist_theme_is_valid'
      and conrelid = 'public.wishlists'::regclass
  ) then
    alter table public.wishlists
      add constraint wishlist_theme_is_valid
      check (theme in ('classic', 'bubblegum'));
  end if;
end;
$$;

-- The return type changed, so PostgreSQL requires recreating this public RPC.
drop function public.get_wishlist(text);

create function public.get_wishlist(p_wishlist_slug text)
returns table (
  slug text,
  title text,
  owner_name text,
  description text,
  icon text,
  theme text,
  visibility text,
  gift_count integer,
  available_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    wishlists.slug,
    wishlists.title,
    wishlists.owner_name,
    wishlists.description,
    wishlists.icon,
    wishlists.theme,
    wishlists.visibility,
    count(gifts.id) filter (where gifts.is_visible = true)::integer as gift_count,
    count(gifts.id) filter (
      where gifts.is_visible = true
        and gifts.reserved_at is null
    )::integer as available_count
  from public.wishlists
  left join public.gifts on gifts.wishlist_id = wishlists.id
  where wishlists.slug = p_wishlist_slug
    and wishlists.is_active = true
    and wishlists.visibility in ('public', 'unlisted')
  group by
    wishlists.id,
    wishlists.slug,
    wishlists.title,
    wishlists.owner_name,
    wishlists.description,
    wishlists.icon,
    wishlists.theme,
    wishlists.visibility;
$$;

revoke all on function public.get_wishlist(text) from public;
grant execute on function public.get_wishlist(text)
  to anon, authenticated, service_role;

-- Keep the previous administrative implementations intact and expose explicit
-- theme-aware signatures for the importer and synchronizer.
create function public.create_wishlist_with_gifts(
  p_slug text,
  p_title text,
  p_owner_name text,
  p_description text,
  p_icon text,
  p_theme text,
  p_visibility text,
  p_is_featured boolean,
  p_display_order integer,
  p_gifts jsonb
)
returns table (
  wishlist_id bigint,
  created_gift_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  result record;
begin
  if p_theme is null or p_theme not in ('classic', 'bubblegum') then
    raise exception 'Invalid wishlist theme.';
  end if;

  select *
  into result
  from public.create_wishlist_with_gifts(
    p_slug => p_slug,
    p_title => p_title,
    p_owner_name => p_owner_name,
    p_description => p_description,
    p_icon => p_icon,
    p_visibility => p_visibility,
    p_is_featured => p_is_featured,
    p_display_order => p_display_order,
    p_gifts => p_gifts
  );

  update public.wishlists
  set theme = p_theme
  where id = result.wishlist_id;

  return query select result.wishlist_id, result.created_gift_count;
end;
$$;

revoke all on function public.create_wishlist_with_gifts(
  text, text, text, text, text, text, text, boolean, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.create_wishlist_with_gifts(
  text, text, text, text, text, text, text, boolean, integer, jsonb
) to service_role;

create function public.sync_wishlist_with_gifts(
  p_slug text,
  p_title text,
  p_owner_name text,
  p_description text,
  p_icon text,
  p_theme text,
  p_visibility text,
  p_is_featured boolean,
  p_display_order integer,
  p_gifts jsonb,
  p_allow_hide_reserved boolean default false
)
returns table (
  wishlist_id bigint,
  added_count integer,
  updated_count integer,
  hidden_count integer,
  restored_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  result record;
begin
  if p_theme is null or p_theme not in ('classic', 'bubblegum') then
    raise exception 'Invalid wishlist theme.';
  end if;

  select *
  into result
  from public.sync_wishlist_with_gifts(
    p_slug => p_slug,
    p_title => p_title,
    p_owner_name => p_owner_name,
    p_description => p_description,
    p_icon => p_icon,
    p_visibility => p_visibility,
    p_is_featured => p_is_featured,
    p_display_order => p_display_order,
    p_gifts => p_gifts,
    p_allow_hide_reserved => p_allow_hide_reserved
  );

  update public.wishlists
  set theme = p_theme
  where id = result.wishlist_id;

  return query select
    result.wishlist_id,
    result.added_count,
    result.updated_count,
    result.hidden_count,
    result.restored_count;
end;
$$;

revoke all on function public.sync_wishlist_with_gifts(
  text, text, text, text, text, text, text, boolean, integer, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.sync_wishlist_with_gifts(
  text, text, text, text, text, text, text, boolean, integer, jsonb, boolean
) to service_role;

commit;
