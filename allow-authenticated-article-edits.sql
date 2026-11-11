-- Permite que cualquier cuenta autenticada edite cualquier artículo.
-- Mantiene las políticas existentes de lectura, creación y borrado.
-- Requiere que RLS ya esté activado en public.articles.
drop policy if exists "preludiopedia_authenticated_update_articles" on public.articles;
create policy "preludiopedia_authenticated_update_articles"
on public.articles
as permissive
for update
to authenticated
using (true)
with check (true);
