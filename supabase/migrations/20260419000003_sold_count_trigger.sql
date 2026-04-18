-- S3-8: auto-increment sponsorship_items.sold_count when a purchase transitions to 'paid'

create or replace function public.increment_sold_count()
returns trigger language plpgsql as $$
begin
  if NEW.payment_status = 'paid' and (OLD.payment_status is distinct from 'paid') then
    update public.sponsorship_items
    set sold_count = sold_count + 1
    where id = NEW.item_id;
  end if;
  return NEW;
end;
$$;

create trigger on_sponsorship_purchase_paid
  after update of payment_status on public.sponsorship_purchases
  for each row execute function public.increment_sold_count();
