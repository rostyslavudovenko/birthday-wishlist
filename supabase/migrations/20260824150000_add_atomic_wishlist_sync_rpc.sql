-- Add an admin-only RPC that synchronizes an existing wishlist and its gifts
-- in one PostgreSQL transaction.

begin;

create or replace function public.sync_wishlist_with_gifts(
  p_slug text,
  p_title text,
  p_owner_name text,
  p_description text,
  p_icon text,
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
  target_wishlist_id bigint;
  gift_record jsonb;
  gift_index integer := 0;
  normalized_gift_key text;
  normalized_store_url text;
  existing_gift_id bigint;
  existing_is_visible boolean;
  result_added_count integer := 0;
  result_updated_count integer := 0;
  result_hidden_count integer := 0;
  result_restored_count integer := 0;
begin
  if p_slug is null
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid wishlist slug.';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'Wishlist title is required.';
  end if;

  if nullif(btrim(p_owner_name), '') is null then
    raise exception 'Wishlist owner name is required.';
  end if;

  if nullif(btrim(p_description), '') is null then
    raise exception 'Wishlist description is required.';
  end if;

  if nullif(btrim(p_icon), '') is null then
    raise exception 'Wishlist icon is required.';
  end if;

  if p_visibility not in ('public', 'unlisted') then
    raise exception 'Invalid wishlist visibility.';
  end if;

  if p_display_order is null or p_display_order < 0 then
    raise exception 'Wishlist display order must be a non-negative integer.';
  end if;

  if p_is_featured = true and p_visibility <> 'public' then
    raise exception 'Only public wishlists can be featured.';
  end if;

  if p_gifts is null
    or jsonb_typeof(p_gifts) <> 'array'
    or jsonb_array_length(p_gifts) = 0 then
    raise exception 'At least one gift is required.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_gifts) as gift(value)
    where jsonb_typeof(gift.value) <> 'object'
      or nullif(btrim(gift.value ->> 'key'), '') is null
      or (gift.value ->> 'key') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or nullif(btrim(gift.value ->> 'name'), '') is null
      or nullif(btrim(gift.value ->> 'description'), '') is null
      or nullif(btrim(gift.value ->> 'price'), '') is null
      or nullif(btrim(gift.value ->> 'image'), '') is null
  ) then
    raise exception 'Every gift must contain valid required fields.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_gifts) as gift(value)
    group by gift.value ->> 'key'
    having count(*) > 1
  ) then
    raise exception 'Gift keys must be unique within a wishlist.';
  end if;

  select id
  into target_wishlist_id
  from public.wishlists
  where slug = p_slug
  for update;

  if target_wishlist_id is null then
    raise exception 'Wishlist slug "%" does not exist.', p_slug;
  end if;

  if p_allow_hide_reserved is not true and exists (
    select 1
    from public.gifts as gifts
    where gifts.wishlist_id = target_wishlist_id
      and gifts.is_visible = true
      and gifts.reserved_at is not null
      and not exists (
        select 1
        from jsonb_array_elements(p_gifts) as incoming(value)
        where incoming.value ->> 'key' = gifts.gift_key
      )
  ) then
    raise exception
      'Sync would hide a reserved gift. Review the preview and rerun with explicit permission.';
  end if;

  update public.wishlists
  set
    title = btrim(p_title),
    owner_name = btrim(p_owner_name),
    description = btrim(p_description),
    icon = btrim(p_icon),
    visibility = p_visibility,
    is_featured = p_is_featured,
    display_order = p_display_order
  where id = target_wishlist_id;

  for gift_record in
    select value
    from jsonb_array_elements(p_gifts)
  loop
    gift_index := gift_index + 1;
    normalized_gift_key := btrim(gift_record ->> 'key');
    normalized_store_url := nullif(btrim(gift_record ->> 'storeUrl'), '');
    existing_gift_id := null;
    existing_is_visible := null;

    select id, is_visible
    into existing_gift_id, existing_is_visible
    from public.gifts
    where wishlist_id = target_wishlist_id
      and gift_key = normalized_gift_key
    for update;

    if existing_gift_id is null then
      insert into public.gifts (
        wishlist_id,
        gift_key,
        name,
        description,
        price,
        image,
        store_url,
        display_order,
        is_visible
      )
      values (
        target_wishlist_id,
        normalized_gift_key,
        btrim(gift_record ->> 'name'),
        btrim(gift_record ->> 'description'),
        btrim(gift_record ->> 'price'),
        btrim(gift_record ->> 'image'),
        normalized_store_url,
        gift_index * 10,
        true
      );

      result_added_count := result_added_count + 1;
    else
      update public.gifts
      set
        name = btrim(gift_record ->> 'name'),
        description = btrim(gift_record ->> 'description'),
        price = btrim(gift_record ->> 'price'),
        image = btrim(gift_record ->> 'image'),
        store_url = normalized_store_url,
        display_order = gift_index * 10,
        is_visible = true
      where id = existing_gift_id;

      result_updated_count := result_updated_count + 1;

      if existing_is_visible is false then
        result_restored_count := result_restored_count + 1;
      end if;
    end if;
  end loop;

  update public.gifts as gifts
  set is_visible = false
  where gifts.wishlist_id = target_wishlist_id
    and gifts.is_visible = true
    and not exists (
      select 1
      from jsonb_array_elements(p_gifts) as incoming(value)
      where incoming.value ->> 'key' = gifts.gift_key
    );

  get diagnostics result_hidden_count = row_count;

  return query
  select
    target_wishlist_id,
    result_added_count,
    result_updated_count,
    result_hidden_count,
    result_restored_count;
end;
$$;

revoke all
on function public.sync_wishlist_with_gifts(
  text, text, text, text, text, text, boolean, integer, jsonb, boolean
)
from public, anon, authenticated;

grant execute
on function public.sync_wishlist_with_gifts(
  text, text, text, text, text, text, boolean, integer, jsonb, boolean
)
to service_role;

commit;
