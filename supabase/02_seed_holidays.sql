-- HK holidays seed — run after 01_schema.sql
BEGIN;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-01-01$wp$::date, $wp$The first day of January$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-01-29$wp$::date, $wp$Lunar New Year's Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-01-30$wp$::date, $wp$The second day of Lunar New Year$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-01-31$wp$::date, $wp$The third day of Lunar New Year$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-04-04$wp$::date, $wp$Ching Ming Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-04-18$wp$::date, $wp$Good Friday$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-04-19$wp$::date, $wp$The day following Good Friday$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-04-21$wp$::date, $wp$Easter Monday$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-05-01$wp$::date, $wp$Labour Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-05-05$wp$::date, $wp$The Birthday of the Buddha$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-05-31$wp$::date, $wp$Tuen Ng Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-07-01$wp$::date, $wp$Hong Kong SAR Establishment Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-10-01$wp$::date, $wp$National Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-10-07$wp$::date, $wp$The day following the Chinese Mid-Autumn Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-10-29$wp$::date, $wp$Chung Yeung Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-12-25$wp$::date, $wp$Christmas Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2025-12-26$wp$::date, $wp$The first weekday after Christmas Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-01-01$wp$::date, $wp$The first day of January$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-02-17$wp$::date, $wp$Lunar New Year's Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-02-18$wp$::date, $wp$The second day of Lunar New Year$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-02-19$wp$::date, $wp$The third day of Lunar New Year$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-04-03$wp$::date, $wp$Good Friday$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-04-04$wp$::date, $wp$The day following Good Friday$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-04-06$wp$::date, $wp$The day following Ching Ming Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-04-07$wp$::date, $wp$The day following Easter Monday$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-05-01$wp$::date, $wp$Labour Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-05-25$wp$::date, $wp$The day following the Birthday of the Buddha$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-06-19$wp$::date, $wp$Tuen Ng Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-07-01$wp$::date, $wp$Hong Kong SAR Establishment Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-09-26$wp$::date, $wp$The day following the Chinese Mid-Autumn Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-10-01$wp$::date, $wp$National Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-10-19$wp$::date, $wp$The day following Chung Yeung Festival$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-12-25$wp$::date, $wp$Christmas Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
INSERT INTO holidays (date, name, region) VALUES ($wp$2026-12-26$wp$::date, $wp$The first weekday after Christmas Day$wp$, $wp$HK$wp$) ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region;
COMMIT;

-- Upserted 34 holidays
