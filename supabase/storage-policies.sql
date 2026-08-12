-- Eseguire dopo aver creato i bucket pubblici `brand-logos` e `product-images`.
-- Lettura: pubblica perché i bucket sono public. Scrittura: solo admin CDP.

drop policy if exists cdp_brand_logos_admin_insert on storage.objects;
drop policy if exists cdp_brand_logos_admin_update on storage.objects;
drop policy if exists cdp_brand_logos_admin_delete on storage.objects;
create policy cdp_brand_logos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-logos' and public.is_admin());
create policy cdp_brand_logos_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'brand-logos' and public.is_admin())
  with check (bucket_id = 'brand-logos' and public.is_admin());
create policy cdp_brand_logos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'brand-logos' and public.is_admin());

drop policy if exists cdp_product_images_admin_insert on storage.objects;
drop policy if exists cdp_product_images_admin_update on storage.objects;
drop policy if exists cdp_product_images_admin_delete on storage.objects;
create policy cdp_product_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy cdp_product_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy cdp_product_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
