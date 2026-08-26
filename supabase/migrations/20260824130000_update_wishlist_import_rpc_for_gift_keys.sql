-- Update the admin-only atomic wishlist import RPC to require stable gift keys.

begin;

create or replace function public.create_wishlist_with_gifts(
  p_slug text,
  p_title text,
  p_owner_name text,
  p_description text,
  p_icon text,
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
  new_wishlist_id bigint;
  gift_record jsonb;
  gift_index integer := 0;
  normalized_gift_key text;
  normalized_store_url text;
begin
  if p_slug is null
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid wishlist slug.';
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
    from public.wishlists
    where slug = p_slug
  ) then
    raise exception 'Wishlist slug "%" already exists.', p_slug;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_gifts) as gift(value)
    where jsonb_typeof(gift.value) <> 'object'
      or nullif(btrim(gift.value ->> 'key'), '') is null
      or (gift.value ->> 'key') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) then
    raise exception 'Every gift must have a valid stable key.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_gifts) as gift(value)
    group by gift.value ->> 'key'
    having count(*) > 1
  ) then
    raise exception 'Gift keys must be unique within a wishlist.';
  end if;

  insert into public.wishlists (
    slug,
    title,
    owner_name,
    description,
    icon,
    visibility,
    is_featured,
    is_active,
    display_order
  )
  values (
    p_slug,
    p_title,
    p_owner_name,
    p_description,
    p_icon,
    p_visibility,
    p_is_featured,
    true,
    p_display_order
  )
  returning id into new_wishlist_id;

  for gift_record in
    select value
    from jsonb_array_elements(p_gifts)
  loop
    gift_index := gift_index + 1;
    normalized_gift_key := btrim(gift_record ->> 'key');

    if nullif(btrim(gift_record ->> 'name'), '') is null then
      raise exception 'Gift % must have a name.', gift_index;
    end if;

    if nullif(btrim(gift_record ->> 'description'), '') is null then
      raise exception 'Gift % must have a description.', gift_index;
    end if;

    if nullif(btrim(gift_record ->> 'price'), '') is null then
      raise exception 'Gift % must have a price.', gift_index;
    end if;

    if nullif(btrim(gift_record ->> 'image'), '') is null then
      raise exception 'Gift % must have an image or fallback icon.', gift_index;
    end if;

    normalized_store_url := nullif(btrim(gift_record ->> 'storeUrl'), '');

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
      new_wishlist_id,
      normalized_gift_key,
      btrim(gift_record ->> 'name'),
      btrim(gift_record ->> 'description'),
      btrim(gift_record ->> 'price'),
      btrim(gift_record ->> 'image'),
      normalized_store_url,
      gift_index * 10,
      true
    );
  end loop;

  return query
  select new_wishlist_id, gift_index;
end;
$$;

revoke all
on function public.create_wishlist_with_gifts(
  text, text, text, text, text, text, boolean, integer, jsonb
)
from public, anon, authenticated;

grant execute
on function public.create_wishlist_with_gifts(
  text, text, text, text, text, text, boolean, integer, jsonb
)
to service_role;

commit;
