
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'subvenciones-captura-api-diaria',
  '0 7 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://project--38d750cd-b153-4aae-aef4-892cbc9810b1.lovable.app/api/public/subvenciones/capturar?modo=api',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer b97d570d8255edf939680e5a281eaa34003a31eedd0b546bcaf43e0449238534"}'::jsonb,
    body := '{}'::jsonb
  )$$
);

SELECT cron.schedule(
  'subvenciones-vigilancia-web-lunes',
  '30 7 * * 1',
  $$SELECT net.http_post(
    url := 'https://project--38d750cd-b153-4aae-aef4-892cbc9810b1.lovable.app/api/public/subvenciones/capturar?modo=web',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer b97d570d8255edf939680e5a281eaa34003a31eedd0b546bcaf43e0449238534"}'::jsonb,
    body := '{}'::jsonb
  )$$
);
