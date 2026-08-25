-- Add stable gift keys used by wishlist export and synchronization.

begin;

alter table public.gifts
add column if not exists gift_key text;

update public.gifts as gifts
set gift_key = mappings.gift_key
from public.wishlists as wishlists
join (
  values
    ('rostyslav', 1::bigint, 'Mechanical Keyboard', 'mechanical-keyboard'),
    ('rostyslav', 2::bigint, 'Coffee Grinder', 'coffee-grinder'),
    ('rostyslav', 3::bigint, 'LEGO Architecture Set', 'lego-architecture-set'),
    ('rostyslav', 12::bigint, 'Noise-Cancelling Headphones', 'noise-cancelling-headphones'),
    ('family-k8x2m7q4', 4::bigint, 'Warm Blanket', 'warm-blanket'),
    ('family-k8x2m7q4', 5::bigint, 'Tea Set', 'tea-set'),
    ('maryna', 8::bigint, 'Scented Candle', 'scented-candle'),
    ('maryna', 9::bigint, 'Hardcover Journal', 'hardcover-journal'),
    ('maryna', 10::bigint, 'Skincare Set', 'skincare-set'),
    ('maryna', 11::bigint, 'Tea Set', 'tea-set')
) as mappings(wishlist_slug, gift_id, gift_name, gift_key)
  on mappings.wishlist_slug = wishlists.slug
where gifts.wishlist_id = wishlists.id
  and gifts.id = mappings.gift_id
  and gifts.name = mappings.gift_name
  and gifts.gift_key is null;

do $$
begin
  if exists (
    select 1
    from public.gifts
    where gift_key is null
  ) then
    raise exception 'Cannot finalize gift_key: at least one gift has no stable key.';
  end if;

  if exists (
    select 1
    from public.gifts
    where gift_key !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) then
    raise exception 'Cannot finalize gift_key: an invalid key was found.';
  end if;

  if exists (
    select 1
    from public.gifts
    group by wishlist_id, gift_key
    having count(*) > 1
  ) then
    raise exception 'Cannot finalize gift_key: duplicate keys exist within a wishlist.';
  end if;
end;
$$;

alter table public.gifts
alter column gift_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gifts'::regclass
      and conname = 'gift_key_is_valid'
  ) then
    alter table public.gifts
    add constraint gift_key_is_valid
    check (gift_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gifts'::regclass
      and conname = 'gifts_wishlist_id_gift_key_key'
  ) then
    alter table public.gifts
    add constraint gifts_wishlist_id_gift_key_key
    unique (wishlist_id, gift_key);
  end if;
end;
$$;

commit;
