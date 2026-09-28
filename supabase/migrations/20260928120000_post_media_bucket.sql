-- Bucket público para mídia renderizada dos posts (PNG dos slides).
-- Mesmo padrão do brand-assets: leitura pública, escrita pelo dono do workspace
-- (a pasta raiz do objeto é o workspace_id).
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post_media_public_read" on storage.objects
  for select using (bucket_id = 'post-media');

create policy "post_media_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'post-media'
    and public.is_workspace_owner((storage.foldername(name))[1]::uuid)
  );

create policy "post_media_owner_update" on storage.objects
  for update using (
    bucket_id = 'post-media'
    and public.is_workspace_owner((storage.foldername(name))[1]::uuid)
  );

create policy "post_media_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'post-media'
    and public.is_workspace_owner((storage.foldername(name))[1]::uuid)
  );
