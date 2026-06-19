-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: agregar campos de perfil extendido a sec_user
-- Nuevas columnas: phone, location, occupation, avatar_url
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.sec_user
    ADD COLUMN IF NOT EXISTS phone      VARCHAR(30),
    ADD COLUMN IF NOT EXISTS location   VARCHAR(150),
    ADD COLUMN IF NOT EXISTS occupation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Actualizar getUserByEmail para que el repositorio incluya los nuevos campos
-- (cambio de código, no SQL)

COMMIT;
