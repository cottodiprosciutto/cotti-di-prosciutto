-- Sostituisci YOUR_USER_UUID con l'UUID del tuo utente in Authentication > Users.
insert into public.admin_users (user_id)
values ('YOUR_USER_UUID'::uuid)
on conflict (user_id) do nothing;

-- Verifica opzionale dal SQL Editor:
select user_id, created_at from public.admin_users;
