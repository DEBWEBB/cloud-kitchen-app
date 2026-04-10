create policy "Allow upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avatars');

create policy "Public read"
on storage.objects
for select
to public
using (bucket_id = 'avatars');
