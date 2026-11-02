# Auditoría Global de Rendimiento, Cuotas y Escalabilidad DB — 2026-11-02T13:26:32.298Z

## 1. Estimación de Cuotas y Proyección de Escalabilidad (Supabase & Render)

> Proyección calculada sobre día 27 de 30 del ciclo.

| metrica | actual | limite_free | pct_actual | proy_fin_mes | escala_5x | escala_20x | estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Egress (Uncached) | 0.17 GB | 5 GB | 3.4% | 0.19 GB (3.8%) | 0.94 GB  | 3.78 GB  | 🟢 Holgado |
| Database Size | 30.12 MB | 500 MB | 6.0% | 33.47 MB (6.7%) | 50.20 MB  | 100.40 MB  | 🟢 Holgado |
| Log Ingestion | 0.14 GB | 1 GB | 14.0% | 0.16 GB (15.6%) | 0.78 GB  | 3.11 GB 🚨 BLOQUEO | 🟡 Monitorear |
| Log Query | 2.10 GB | 100 GB | 2.1% | 2.33 GB (2.3%) | 4.67 GB  | 11.67 GB  | 🟢 Holgado |
| Realtime Messages | 0.05 M msgs | 2 M msgs | 2.5% | 0.06 M msgs (2.8%) | 0.28 M msgs  | 1.11 M msgs  | 🟢 Holgado |

## 2. Diagnóstico Relacional de Base de Datos (PostgreSQL / Supabase)

### Tamaño de la base y versión

| db | size | version |
| --- | --- | --- |
| postgres | 45 MB | PostgreSQL 17.6 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit |

### Parámetros relevantes de rendimiento, timeouts y logs

| name | setting | unit |
| --- | --- | --- |
| default_transaction_isolation | read committed |  |
| idle_in_transaction_session_timeout | 0 | ms |
| log_connections | off |  |
| log_disconnections | off |  |
| log_min_duration_statement | -1 | ms |
| log_statement | ddl |  |
| max_connections | 60 |  |
| shared_buffers | 28672 | 8kB |
| statement_timeout | 15000 | ms |
| synchronous_commit | on |  |
| track_io_timing | off |  |
| work_mem | 2184 | kB |

### Top relaciones por tamaño (incluye todos los esquemas de usuario)

| schema | tabla | filas_est | total | indices | seq_scan | idx_scan | ins | upd | del | dead | ult_autovacuum |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| public | choferes_km_mensual | 3827 | 8648 kB | 1120 kB | 7476 | 1196297 | 3831 | 43377 | 2 | 753 | 2026-11-02 |
| public | diagramas | 2531 | 6336 kB | 752 kB | 1975 | 39034330 | 2731 | 202229 | 192 | 422 | 2026-10-22 |
| panol | items | 7345 | 4056 kB | 1688 kB | 709 | 176449 | 7345 | 7409 | 0 | 12 | 2026-10-20 |
| public | choferes | 265 | 1760 kB | 128 kB | 237659 | 5402575 | 349 | 1157570 | 84 | 0 | 2026-11-02 |
| panol | work_order_tasks | 276 | 1384 kB | 648 kB | 300 | 57842 | 4201 | 5031 | 3925 | 93 | 2026-10-20 |
| public | seguridad_vial_incidentes_ijl | 2834 | 1136 kB | 744 kB | 22 | 2903 | 2834 | 0 | 0 | 0 | 2026-10-20 |
| public | seguridad_vial | 2430 | 1096 kB | 584 kB | 252 | 70656 | 2430 | 926 | 0 | 0 | 2026-10-30 |
| public | cisternas_km | 1279 | 992 kB | 560 kB | 390 | 132373 | 1280 | 130469 | 1 | 0 | 2026-11-02 |
| public | chofer_observaciones | 857 | 744 kB | 232 kB | 476 | 17009 | 51601 | 636 | 50743 | 109 | 2026-10-05 |
| panol | unit_work_orders | 292 | 632 kB | 424 kB | 718 | 384872 | 1816 | 1544 | 1521 | 41 | 2026-10-20 |
| panol | work_orders | 298 | 536 kB | 232 kB | 9078 | 339937 | 1364 | 4280 | 1065 | 51 | 2026-10-20 |
| storage | objects | 290 | 504 kB | 280 kB | 39 | 4811 | 593 | 21 | 0 | 9 | 2026-10-29 |
| public | unidades | 288 | 440 kB | 192 kB | 116515 | 4867785 | 641 | 1033084 | 341 | 0 | 2026-11-02 |
| public | chofer_documentacion | 261 | 328 kB | 120 kB | 96539 | 168344 | 309 | 16814 | 35 | 75 | 2026-10-19 |
| public | semis | 355 | 296 kB | 136 kB | 247697 | 868194 | 610 | 18433 | 509 | 7 | 2026-10-26 |
| public | tractores | 480 | 272 kB | 144 kB | 352223 | 890979 | 523 | 20759 | 43 | 143 | 2026-10-17 |
| panol | stock_movements | 12 | 256 kB | 224 kB | 21572 | 22033 | 71 | 90 | 57 | 42 | 2026-10-20 |
| panol | work_orders_cold | 0 | 240 kB | 136 kB | 6427 | 1117 | 534 | 1 | 494 | 0 | 2026-10-20 |
| panol | orders | 5 | 232 kB | 200 kB | 12027 | 22567 | 36 | 60 | 29 | 17 | 2026-10-20 |
| public | movimientos | 141 | 208 kB | 160 kB | 70967 | 543443 | 281883 | 36 | 281731 | 0 | 2026-11-02 |
| auth | users | -1 | 208 kB | 192 kB | 1653 | 121 | 28 | 3 | 0 | 19 |  |
| panol | staff_holds | 15 | 200 kB | 152 kB | 2645 | 217 | 71 | 19 | 53 | 5 | 2026-10-22 |
| public | novedades | 33 | 184 kB | 128 kB | 81926 | 84572 | 110 | 171 | 75 | 4 | 2026-10-30 |
| panol | staff | 71 | 128 kB | 80 kB | 6187 | 50322 | 72 | 149 | 1 | 9 |  |
| public | eor_sync_queue | 2 | 112 kB | 64 kB | 4906 | 65 | 4645 | 132 | 3406 | 0 | 2026-10-30 |
| panol | order_items_legacy_backup | 0 | 96 kB | 80 kB | 2687 | 157 | 38 | 9 | 38 | 38 |  |
| realtime | subscription | 10 | 96 kB | 48 kB | 1022527 | 131573 | 2802 | 36 | 2776 | 25 | 2026-10-30 |
| auth | scim_users | -1 | 88 kB | 80 kB | 24 | 3 | 0 | 0 | 0 | 0 |  |
| auth | one_time_tokens | -1 | 88 kB | 80 kB | 14 | 2 | 0 | 0 | 0 | 0 |  |
| public | dash_menciones | -1 | 80 kB | 64 kB | 21 | 115172 | 2 | 0 | 2 | 2 |  |

### Ventana de pg_stat_statements

| desde | dealloc |
| --- | --- |
| 2026-09-22 06:32:32.328165-03 | 82 |

### Top sentencias por tiempo total acumulado

| calls | total_ms | mean_ms | rows | filas_x_call | rol | query |
| --- | --- | --- | --- | --- | --- | --- |
| 1515789 | 11005259.8 | 7.26 | 2536918 | 1.7 | supabase_admin | SELECT wal->>$5 as type, wal->>$6 as schema, wal->>$7 as table, COALESCE(wal->>$8, $9) as columns, COALESCE(wal->>$10, $11) as record, COALE |
| 33661 | 3562083.3 | 105.82 | 33661 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_calendario_km"."id_chofer", "public"."view_calendario_km"."km_totales", "public"."view_calendar |
| 39487 | 1624145.3 | 41.13 | 39487 | 1.0 | anon | WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_fecha" FROM json_to_record(pgrst |
| 1503 | 936420.4 | 623.03 | 117234 | 78.0 | postgres | SELECT e.name, n.nspname AS schema, e.default_version, x.extversion AS installed_version, e.comment, ev.schema AS default_version_schema FRO |
| 2039 | 865903.2 | 424.67 | 540335 | 265.0 | postgres | SELECT * FROM public.view_individual_chofer ORDER BY nombre ASC |
| 7771 | 799112.5 | 102.83 | 7771 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_calendario_km"."id_chofer", "public"."view_calendario_km"."km_totales", "public"."view_calendar |
| 14812 | 743668.5 | 50.21 | 14812 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_flota_operativa".* FROM "public"."view_flota_operativa" LIMIT $1 OFFSET $2 ) SELECT $3::bigint  |
| 6906 | 454282.0 | 65.78 | 1823780 | 264.1 | postgres | SELECT * FROM public.view_flota_operativa ORDER BY tractor ASC NULLS LAST, semi ASC NULLS LAST |
| 7423 | 349788.8 | 47.12 | 7423 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_dash_retorno".* FROM "public"."view_dash_retorno" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS tot |
| 8783 | 335342.4 | 38.18 | 8783 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_diaria_operativa".* FROM "public"."view_diaria_operativa" ORDER BY "public"."view_diaria_operat |
| 8428 | 297532.1 | 35.30 | 244030 | 29.0 | postgres | SELECT * FROM public.view_diaria_operativa ORDER BY nombre ASC LIMIT $1 OFFSET $2 |
| 412 | 258158.0 | 626.60 | 412 | 1.0 | postgres | SELECT (SELECT COALESCE(json_agg(json_build_object( $2, chofer_id, $3, mes_tab, $4, mes_numero, $5, anio, $6, tira_dias, $7, contabilizador  |
| 8074 | 253360.3 | 31.38 | 405470 | 50.2 | postgres | SELECT * FROM public.fn_personal_retorno($1::date) ORDER BY fecha_retorno ASC, nombre ASC |
| 2040 | 252488.6 | 123.77 | 155020 | 76.0 | postgres | SELECT * FROM public.view_personal_retorno ORDER BY fecha_retorno ASC, nombre ASC |
| 456 | 219655.3 | 481.70 | 545376 | 1196.0 | authenticator | SELECT name FROM pg_timezone_names |
| 636 | 210692.6 | 331.28 | 636 | 1.0 | anon | WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_fecha" FROM json_to_record(pgrst |
| 588 | 203659.0 | 346.36 | 1335348 | 2271.0 | postgres | SELECT * FROM public.view_diagrama_mensual ORDER BY chofer_nombre ASC |
| 420 | 180779.9 | 430.43 | 953820 | 2271.0 | postgres | SELECT diagrama_id, chofer_id, mes_tab, anio, mes_numero, tira_dias, contabilizador, km_mes_total, cant_viajes_mes, dias_km FROM public.view |
| 70285 | 171094.1 | 2.43 | 70285 | 1.0 | pgbouncer | SELECT * FROM pgbouncer.get_auth($1) |
| 2041 | 164515.0 | 80.61 | 540865 | 265.0 | postgres | SELECT * FROM public.view_diaria_operativa ORDER BY nombre ASC |
| 6044 | 140451.5 | 23.24 | 6023 | 1.0 | postgres | with base_table_info as ( select c.oid::int8 as id, nc.nspname as schema, c.relname as name, c.relkind, c.relrowsecurity as rls_enabled, c.r |
| 1769 | 120343.1 | 68.03 | 270164 | 152.7 | postgres | INSERT INTO public.movimientos (id_unidad, id_chofer, actualizado_el) SELECT id_unidad, id_chofer, NOW() FROM jsonb_to_recordset($1::jsonb)  |
| 167 | 118222.3 | 707.92 | 670505 | 4015.0 | postgres | SELECT diagrama_id, chofer_id, mes_tab, anio, mes_numero, tira_dias, contabilizador, km_mes_total, cant_viajes_mes, dias_km FROM public.view |
| 29625 | 118191.3 | 3.99 | 29625 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_diaria_operativa".* FROM "public"."view_diaria_operativa" ORDER BY "public"."view_diaria_operat |
| 2532 | 117568.5 | 46.43 | 2532000 | 1000.0 | postgres | INSERT INTO public.movimientos_km (fecha, id_unidad, id_chofer, dominio, chofer_nombre, km_totales, hoja_ruta) VALUES ($1, $2, $3, $4, $5, $ |

### Top sentencias por frecuencia (detecta polling / loops)

| calls | mean_ms | rows | filas_x_call | rol | query |
| --- | --- | --- | --- | --- | --- |
| 1515792 | 7.26 | 2536921 | 1.7 | supabase_admin | SELECT wal->>$5 as type, wal->>$6 as schema, wal->>$7 as table, COALESCE(wal->>$8, $9) as columns, COALESCE(wal->>$10, $11) as record, COALE |
| 178888 | 0.14 | 178888 | 1.0 | anon | select set_config('search_path', $1, true), set_config($2, $3, true), set_config($4, $5, true), set_config('role', $6, true), set_config('re |
| 102025 | 0.62 | 102025 | 1.0 | anon | select set_config('search_path', $1, true), set_config($2, $3, true), set_config('role', $4, true), set_config('request.jwt.claims', $5, tru |
| 70285 | 2.43 | 70285 | 1.0 | pgbouncer | SELECT * FROM pgbouncer.get_auth($1) |
| 63982 | 0.26 | 63982 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."novedades".* FROM "public"."novedades" WHERE "public"."novedades"."resuelto" = $1 LIMIT $2 OFFSET $3 |
| 39487 | 41.13 | 39487 | 1.0 | anon | WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "p_fecha" FROM json_to_record(pgrst |
| 35267 | 0.03 | 0 | 0.0 | postgres | SET statement_timeout='58s' |
| 35267 | 0.01 | 0 | 0.0 | postgres | SET idle_session_timeout='58s' |
| 33661 | 105.82 | 33661 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_calendario_km"."id_chofer", "public"."view_calendario_km"."km_totales", "public"."view_calendar |
| 29625 | 3.99 | 29625 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_diaria_operativa".* FROM "public"."view_diaria_operativa" ORDER BY "public"."view_diaria_operat |
| 27775 | 2.86 | 127808 | 4.6 | supabase_admin | select schemaname, tablename, format($2, schemaname, tablename)::regclass as oid from pg_publication_tables where pubname = $1 |
| 24213 | 0.16 | 24213 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."chofer_documentacion".* FROM "public"."chofer_documentacion" WHERE "public"."chofer_documentacion"." |
| 23103 | 0.19 | 2024 | 0.1 | postgres | INSERT INTO panol.work_order_tasks ( id, work_order_id, task_index, sector_task, estado, porcentaje, created_at, updated_at ) VALUES ( gen_r |
| 14812 | 50.21 | 14812 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_flota_operativa".* FROM "public"."view_flota_operativa" LIMIT $1 OFFSET $2 ) SELECT $3::bigint  |
| 14792 | 0.10 | 0 | 0.0 | authenticator | SET client_encoding = 'UTF8' |
| 14790 | 0.01 | 0 | 0.0 | authenticator | SET client_min_messages TO WARNING |
| 14648 | 0.24 | 0 | 0.0 | authenticator | BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY |
| 14536 | 0.00 | 0 | 0.0 | anon | COMMIT |
| 13741 | 3.04 | 151151 | 11.0 | postgres | SELECT relname, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables WHERE relname IN ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ORD |
| 13153 | 4.80 | 92021 | 7.0 | postgres | SELECT relname, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables WHERE relname IN ($1, $2, $3, $4, $5, $6, $7) ORDER BY relname ASC |
| 11854 | 0.05 | 0 | 0.0 | supabase_admin | SHOW transaction_read_only |
| 9135 | 8.97 | 9135 | 1.0 | postgres | SELECT COUNT(*) AS total FROM public.view_diaria_operativa |
| 8783 | 38.18 | 8783 | 1.0 | anon | WITH pgrst_source AS ( SELECT "public"."view_diaria_operativa".* FROM "public"."view_diaria_operativa" ORDER BY "public"."view_diaria_operat |
| 8555 | 0.00 | 0 | 0.0 | supabase_storage_admin | BEGIN |
| 8428 | 35.30 | 244030 | 29.0 | postgres | SELECT * FROM public.view_diaria_operativa ORDER BY nombre ASC LIMIT $1 OFFSET $2 |

### Top sentencias por filas devueltas (proxy de egress)

| rows | calls | filas_x_call | rol | query |
| --- | --- | --- | --- | --- |
| 4686109 | 638 | 7345.0 | postgres | SELECT item_code, name, brand, category, requires_exchange, stock, location FROM panol.items WHERE is_active = $1 ORDER BY name |
| 2759597 | 5770 | 478.3 | postgres | SELECT id, servicio_id, patente, n_interno, marca, modelo, vtv, mas, estado FROM tractores ORDER BY patente ASC |
| 2536925 | 1515796 | 1.7 | supabase_admin | SELECT wal->>$5 as type, wal->>$6 as schema, wal->>$7 as table, COALESCE(wal->>$8, $9) as columns, COALESCE(wal->>$10, $11) as record, COALE |
| 2532000 | 2532 | 1000.0 | postgres | INSERT INTO public.movimientos_km (fecha, id_unidad, id_chofer, dominio, chofer_nombre, km_totales, hoja_ruta) VALUES ($1, $2, $3, $4, $5, $ |
| 2063157 | 5769 | 357.6 | postgres | SELECT id, servicio_id, patente, n_interno, marca, cisternado, esp_es, vi, ve, vtv, mas, estado FROM semis ORDER BY patente ASC |
| 1823780 | 6906 | 264.1 | postgres | SELECT * FROM public.view_flota_operativa ORDER BY tractor ASC NULLS LAST, semi ASC NULLS LAST |
| 1667325 | 5773 | 288.8 | postgres | SELECT id, n_ute, servicio_id, tractor_id, semi_id, fecha_acople, estado FROM unidades ORDER BY n_ute ASC |
| 1507345 | 5696 | 264.6 | postgres | SELECT * FROM chofer_documentacion |
| 1502371 | 5671 | 264.9 | postgres | SELECT id, nombre, legajo, servicio_id, estado, unidad_id, foto FROM choferes ORDER BY nombre ASC |
| 1335348 | 588 | 2271.0 | postgres | SELECT * FROM public.view_diagrama_mensual ORDER BY chofer_nombre ASC |
| 1238096 | 136 | 9103.6 | postgres | SELECT TO_CHAR(fecha, $2) AS fecha, dominio, chofer_nombre, km AS km_totales, hoja_ruta, id_chofer, id_unidad FROM view_calendario_km WHERE  |
| 953820 | 420 | 2271.0 | postgres | SELECT diagrama_id, chofer_id, mes_tab, anio, mes_numero, tira_dias, contabilizador, km_mes_total, cant_viajes_mes, dias_km FROM public.view |
| 873789 | 5666 | 154.2 | postgres | SELECT * FROM movimientos |
| 756223 | 93 | 8131.4 | postgres | SELECT TO_CHAR(fecha, $2) AS fecha, dominio, chofer_nombre, km AS km_totales, hoja_ruta, id_chofer, id_unidad FROM view_calendario_km WHERE  |
| 687277 | 2613 | 263.0 | postgres | SELECT chofer_id, nombre, dni, servicio, foto, telefono, estado_chofer FROM public.view_individual_chofer ORDER BY nombre ASC |
| 670505 | 167 | 4015.0 | postgres | SELECT diagrama_id, chofer_id, mes_tab, anio, mes_numero, tira_dias, contabilizador, km_mes_total, cant_viajes_mes, dias_km FROM public.view |
| 577067 | 2211 | 261.0 | postgres | SELECT chofer_id, nombre, legajo, dni, servicio, foto, telefono, estado_chofer FROM public.view_individual_chofer ORDER BY nombre ASC |
| 545376 | 456 | 1196.0 | authenticator | SELECT name FROM pg_timezone_names |
| 541130 | 2042 | 265.0 | postgres | SELECT * FROM public.view_diaria_operativa ORDER BY nombre ASC |
| 540335 | 2039 | 265.0 | postgres | SELECT * FROM public.view_individual_chofer ORDER BY nombre ASC |

### Cache hit ratio (objetivo > 99%)

| tablas_pct | indices_pct |
| --- | --- |
| 100.00 | 100.00 |

### Tablas con más seq scans que index scans (> 300 filas)

_(sin filas)_

### Índices nunca usados (no PK / no UNIQUE)

| schema | tabla | indice | idx_scan | tam |
| --- | --- | --- | --- | --- |
| panol | items | idx_panol_items_upper_name | 0 | 472 kB |
| public | seguridad_vial | idx_seguridad_vial_icm | 0 | 160 kB |
| public | cisternas_km | idx_cisternas_km_patente | 0 | 56 kB |
| public | cisternas_km | idx_cisternas_km_unidad_id | 0 | 56 kB |
| public | cisternas_km | idx_cisternas_km_chofer_id | 0 | 56 kB |
| public | seguridad_vial_incidentes_ijl | idx_sv_incidentes_chofer_id | 0 | 48 kB |
| public | cisternas_km | idx_cisternas_km_estado | 0 | 48 kB |
| storage | objects | name_prefix_search | 0 | 40 kB |
| auth | one_time_tokens | one_time_tokens_relates_to_hash_idx | 0 | 32 kB |
| public | chofer_observaciones | idx_chofer_obs_unidad_id | 0 | 32 kB |
| auth | one_time_tokens | one_time_tokens_token_hash_hash_idx | 0 | 32 kB |
| storage | objects | idx_objects_bucket_id_name | 0 | 32 kB |
| panol | stock_movements | idx_stock_mov_created_at_brin | 0 | 24 kB |
| auth | users | users_is_anonymous_idx | 0 | 16 kB |
| panol | staff_holds | idx_staff_holds_staff_id | 0 | 16 kB |
| panol | work_order_tasks | idx_wot_worker_active | 0 | 16 kB |
| panol | work_orders_cold | idx_woc_status | 0 | 16 kB |
| panol | orders | idx_panol_orders_created_desc | 0 | 16 kB |
| auth | users | users_instance_id_idx | 0 | 16 kB |
| public | eor_sync_queue | idx_eor_sync_estado | 0 | 16 kB |

### Índices duplicados o redundantes que duplican PK / UNIQUE

| schema | tabla | indice_duplicado | tam | definicion |
| --- | --- | --- | --- | --- |
| auth | custom_oauth_providers | custom_oauth_providers_identifier_idx | 8192 bytes | CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier) |
| auth | oauth_consents | oauth_consents_active_user_client_idx | 8192 bytes | CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL) |
| auth | users | idx_users_email | 16 kB | CREATE INDEX idx_users_email ON auth.users USING btree (email) |
| panol | orders | idx_panol_orders_req | 16 kB | CREATE INDEX idx_panol_orders_req ON panol.orders USING btree (req_code) |
| panol | staff | idx_panol_staff_op_code | 16 kB | CREATE INDEX idx_panol_staff_op_code ON panol.staff USING btree (op_code) |
| panol | staff | idx_staff_op_code | 16 kB | CREATE INDEX idx_staff_op_code ON panol.staff USING btree (op_code) |
| panol | staff_holds | idx_staff_holds_staff_tractor | 16 kB | CREATE UNIQUE INDEX idx_staff_holds_staff_tractor ON panol.staff_holds USING btree (staff_id, tractor_id) WHERE (tractor_id IS NOT NULL) |
| panol | staff_holds | idx_staff_holds_unique_tractor | 16 kB | CREATE UNIQUE INDEX idx_staff_holds_unique_tractor ON panol.staff_holds USING btree (staff_id, tractor_id) WHERE (tractor_id IS NOT NULL) |
| panol | unit_work_orders | idx_uwo_semi | 40 kB | CREATE INDEX idx_uwo_semi ON panol.unit_work_orders USING btree (semi_id) |
| panol | unit_work_orders | idx_uwo_tractor | 40 kB | CREATE INDEX idx_uwo_tractor ON panol.unit_work_orders USING btree (tractor_id) |
| panol | unit_work_orders | idx_uwo_work_order | 56 kB | CREATE INDEX idx_uwo_work_order ON panol.unit_work_orders USING btree (work_order_id) |
| panol | work_orders | idx_wo_ot_number | 40 kB | CREATE INDEX idx_wo_ot_number ON panol.work_orders USING btree (ot_number) |
| public | diagramas | idx_diagramas_chofer_anio_mes | 200 kB | CREATE INDEX idx_diagramas_chofer_anio_mes ON public.diagramas USING btree (chofer_id, anio DESC, mes_numero DESC) |
| storage | objects | idx_objects_bucket_id_name | 32 kB | CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C") |
| storage | objects | idx_objects_current_version | 40 kB | CREATE UNIQUE INDEX idx_objects_current_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (archived_at IS NULL) |
| storage | objects | idx_objects_delete_markers | 8192 bytes | CREATE INDEX idx_objects_delete_markers ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE is_delete_marker |
| storage | objects | idx_objects_null_version | 40 kB | CREATE UNIQUE INDEX idx_objects_null_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (NOT is_versioned) |

### FKs sin índice en la columna origen (riesgo de table locks y deletes lentos)

| tabla | fk | definicion |
| --- | --- | --- |
| auth.mfa_challenges | mfa_challenges_auth_factor_id_fkey | FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE |
| auth.oauth_authorizations | oauth_authorizations_client_id_fkey | FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE |
| auth.oauth_authorizations | oauth_authorizations_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE |
| auth.saml_relay_states | saml_relay_states_flow_state_id_fkey | FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE |
| storage.s3_multipart_uploads_parts | s3_multipart_uploads_parts_upload_id_fkey | FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE |
| storage.s3_multipart_uploads_parts | s3_multipart_uploads_parts_bucket_id_fkey | FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id) |
| storage.vector_indexes | vector_indexes_bucket_id_fkey | FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id) |

### Vistas con scans laterales JSONB (riesgo alto de CPU / latencia > 100ms)

| schema | vista | advertencia | largo_def |
| --- | --- | --- | --- |
| panol | v_coord_kanban_terminados | jsonb_each / jsonb_array_elements lateral scan | 11180 |
| public | v_canon_chofer_operativo | jsonb_each / jsonb_array_elements lateral scan | 3608 |
| public | view_diaria_operativa | jsonb_each / jsonb_array_elements lateral scan | 4146 |

### Integridad por tabla (PK, FK, UNIQUE, CHECK, RLS, Replica Identity)

| schema | tabla | pk | fk | uq | ck | rls | replica_identity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| auth | audit_log_entries | 1 | 0 | 0 | 0 | true | default |
| auth | custom_oauth_providers | 1 | 0 | 1 | 18 | false | default |
| auth | flow_state | 1 | 0 | 0 | 0 | true | default |
| auth | identities | 1 | 1 | 1 | 0 | true | default |
| auth | instances | 1 | 0 | 0 | 0 | true | default |
| auth | mfa_amr_claims | 1 | 1 | 1 | 0 | true | default |
| auth | mfa_challenges | 1 | 1 | 0 | 0 | true | default |
| auth | mfa_factors | 1 | 1 | 1 | 0 | true | default |
| auth | mfa_recovery_code_sets | 1 | 2 | 2 | 1 | false | default |
| auth | mfa_recovery_codes | 1 | 1 | 0 | 0 | false | default |
| auth | oauth_authorizations | 1 | 2 | 2 | 8 | false | default |
| auth | oauth_client_states | 1 | 0 | 0 | 0 | false | default |
| auth | oauth_clients | 1 | 0 | 0 | 4 | false | default |
| auth | oauth_consents | 1 | 2 | 1 | 3 | false | default |
| auth | one_time_tokens | 1 | 1 | 0 | 1 | true | default |
| auth | refresh_tokens | 1 | 1 | 1 | 0 | true | default |
| auth | saml_providers | 1 | 1 | 1 | 3 | true | default |
| auth | saml_relay_states | 1 | 2 | 0 | 1 | true | default |
| auth | schema_migrations | 1 | 0 | 0 | 0 | true | default |
| auth | scim_tokens | 1 | 1 | 0 | 3 | false | default |
| auth | scim_users | 1 | 2 | 0 | 0 | false | default |
| auth | sessions | 1 | 2 | 0 | 1 | true | default |
| auth | sso_domains | 1 | 1 | 0 | 1 | true | default |
| auth | sso_providers | 1 | 0 | 0 | 1 | true | default |
| auth | users | 1 | 0 | 1 | 1 | true | default |
| auth | webauthn_challenges | 1 | 1 | 0 | 1 | false | default |
| auth | webauthn_credentials | 1 | 1 | 0 | 0 | false | default |
| panol | items | 1 | 0 | 1 | 1 | true | default |
| panol | order_items_legacy_backup | 1 | 2 | 0 | 1 | true | default |
| panol | orders | 1 | 7 | 1 | 0 | true | default |
| panol | staff | 1 | 1 | 1 | 0 | true | default |
| panol | staff_holds | 1 | 6 | 0 | 0 | true | default |
| panol | stock_movements | 1 | 5 | 0 | 0 | true | default |
| panol | unit_work_orders | 1 | 3 | 3 | 1 | false | default |
| panol | work_order_tasks | 1 | 2 | 1 | 1 | false | default |
| panol | work_orders | 1 | 0 | 1 | 1 | false | default |
| panol | work_orders_cold | 1 | 2 | 0 | 0 | false | default |
| public | chofer_documentacion | 1 | 1 | 1 | 0 | true | default |
| public | chofer_observaciones | 1 | 2 | 0 | 0 | true | default |
| public | choferes | 1 | 2 | 0 | 1 | true | full |
| public | choferes_km_mensual | 1 | 1 | 1 | 0 | true | default |
| public | cisternas_km | 1 | 4 | 0 | 1 | true | default |
| public | dash | 1 | 1 | 0 | 0 | true | default |
| public | dash_menciones | 1 | 2 | 1 | 0 | true | default |
| public | diagramas | 1 | 1 | 0 | 0 | true | full |
| public | eor | 1 | 1 | 0 | 0 | true | default |
| public | eor_sync_queue | 1 | 1 | 0 | 3 | true | default |
| public | log_queries | 1 | 0 | 0 | 0 | true | default |
| public | movimientos | 1 | 2 | 2 | 0 | true | full |
| public | novedades | 1 | 5 | 0 | 0 | true | default |
| public | panol | 1 | 1 | 0 | 0 | true | default |
| public | seguridad_vial | 1 | 1 | 1 | 0 | false | default |
| public | seguridad_vial_incidentes_ijl | 1 | 1 | 1 | 0 | false | default |
| public | semis | 1 | 1 | 1 | 1 | true | default |
| public | servicios_choferes | 1 | 1 | 1 | 0 | true | default |
| public | servicios_unidades | 1 | 0 | 1 | 0 | true | default |
| public | terminales | 1 | 0 | 1 | 0 | true | default |
| public | tipos_novedad | 1 | 0 | 1 | 0 | true | default |
| public | tractores | 1 | 1 | 1 | 1 | true | default |
| public | unidades | 1 | 3 | 0 | 1 | true | full |
| public | usuarios_auth | 1 | 0 | 1 | 0 | true | default |
| realtime | messages_2026_10_30 | 1 | 0 | 0 | 1 | false | default |
| realtime | messages_2026_10_31 | 1 | 0 | 0 | 1 | false | default |
| realtime | messages_2026_11_01 | 1 | 0 | 0 | 1 | false | default |
| realtime | messages_2026_11_02 | 1 | 0 | 0 | 1 | false | default |
| realtime | messages_2026_11_03 | 1 | 0 | 0 | 1 | false | default |
| realtime | messages_2026_11_04 | 1 | 0 | 0 | 1 | false | default |
| realtime | messages_2026_11_05 | 1 | 0 | 0 | 1 | false | default |
| realtime | schema_migrations | 1 | 0 | 0 | 0 | false | default |
| realtime | subscription | 1 | 0 | 0 | 1 | false | default |
| storage | buckets | 1 | 0 | 0 | 5 | true | default |
| storage | buckets_analytics | 1 | 0 | 0 | 0 | true | default |
| storage | buckets_vectors | 1 | 0 | 0 | 0 | true | default |
| storage | migrations | 1 | 0 | 1 | 0 | true | default |
| storage | objects | 1 | 1 | 0 | 0 | true | default |
| storage | s3_multipart_uploads | 1 | 1 | 0 | 0 | true | default |
| storage | s3_multipart_uploads_parts | 1 | 2 | 0 | 0 | true | default |
| storage | vector_indexes | 1 | 1 | 0 | 0 | true | default |
| vault | secrets | 1 | 0 | 0 | 0 | false | default |

### Tablas publicadas en Realtime (genera replicación continua de WAL)

| pubname | schemaname | tablename |
| --- | --- | --- |
| supabase_realtime | panol | work_order_tasks |
| supabase_realtime | panol | work_orders |
| supabase_realtime | public | choferes |
| supabase_realtime | public | choferes_km_mensual |
| supabase_realtime | public | diagramas |
| supabase_realtime | public | movimientos |
| supabase_realtime | public | novedades |
| supabase_realtime | public | unidades |
| supabase_realtime_messages_publication | realtime | messages_2026_10_30 |
| supabase_realtime_messages_publication | realtime | messages_2026_10_31 |
| supabase_realtime_messages_publication | realtime | messages_2026_11_01 |
| supabase_realtime_messages_publication | realtime | messages_2026_11_02 |
| supabase_realtime_messages_publication | realtime | messages_2026_11_03 |
| supabase_realtime_messages_publication | realtime | messages_2026_11_04 |
| supabase_realtime_messages_publication | realtime | messages_2026_11_05 |

### Triggers activos de esquemas de usuario

| schema | tabla | trigger_name | momento | eventos | accion |
| --- | --- | --- | --- | --- | --- |
| panol | order_items | trg_order_items_view_io | INSTEAD OF | DELETE,UPDATE,INSERT | EXECUTE FUNCTION panol.trg_order_items_view_sync() |
| panol | unit_work_orders | trg_uwo_supersede_active_ot | BEFORE | INSERT,UPDATE | EXECUTE FUNCTION panol.handle_supersede_active_ot() |
| panol | work_order_tasks | trg_wot_sync_avg | AFTER | INSERT,DELETE,UPDATE | EXECUTE FUNCTION panol.sync_work_order_avg() |
| panol | work_orders | trg_autoclean_completed_holds | AFTER | UPDATE | EXECUTE FUNCTION panol.fn_autoclean_completed_holds() |
| public | chofer_documentacion | trg_sync_documentacion | BEFORE | UPDATE | EXECUTE FUNCTION fn_trg_sync_documentacion() |
| public | choferes | trg_sync_asignacion | BEFORE | UPDATE | EXECUTE FUNCTION fn_trg_sync_asignacion() |
| public | choferes_km_mensual | trg_protect_choferes_km_mensual | BEFORE | UPDATE | EXECUTE FUNCTION trg_protect_choferes_km_mensual() |
| public | dash | trg_sync_dash_auth | BEFORE | INSERT | EXECUTE FUNCTION sync_auth_user_for_satellite() |
| public | diagramas | trg_sync_diagramas | BEFORE | UPDATE | EXECUTE FUNCTION fn_trg_sync_diagramas() |
| public | eor | trg_sync_eor_auth | BEFORE | INSERT | EXECUTE FUNCTION sync_auth_user_for_satellite() |
| public | movimientos | trg_movimientos_sync | AFTER | UPDATE,INSERT,DELETE | EXECUTE FUNCTION fn_trg_movimientos_sync() |
| public | panol | trg_sync_panol_auth | BEFORE | INSERT | EXECUTE FUNCTION sync_auth_user_for_panol() |
| realtime | subscription | tr_check_filters | BEFORE | UPDATE,INSERT | EXECUTE FUNCTION realtime.subscription_check_filters() |
| storage | buckets | enforce_bucket_name_length_trigger | BEFORE | INSERT,UPDATE | EXECUTE FUNCTION storage.enforce_bucket_name_length() |
| storage | buckets | enforce_versioning_status_transition | BEFORE | UPDATE | EXECUTE FUNCTION storage.enforce_versioning_status_transition() |
| storage | buckets | protect_bucket_control_insert | BEFORE | INSERT | EXECUTE FUNCTION storage.protect_bucket_control_columns('service_role') |
| storage | buckets | protect_bucket_control_update | BEFORE | UPDATE | EXECUTE FUNCTION storage.protect_bucket_control_columns() |
| storage | buckets | protect_bucket_control_update_role | AFTER | UPDATE | EXECUTE FUNCTION storage.enforce_bucket_lifecycle_service_role('service_role') |
| storage | buckets | protect_buckets_delete | BEFORE | DELETE | EXECUTE FUNCTION storage.protect_delete() |
| storage | objects | protect_objects_delete | BEFORE | DELETE | EXECUTE FUNCTION storage.protect_delete() |
| storage | objects | update_objects_updated_at | BEFORE | UPDATE | EXECUTE FUNCTION storage.update_updated_at_column() |

### Vistas y vistas materializadas activas

| schema | vista | tipo | largo_def |
| --- | --- | --- | --- |
| extensions | pg_stat_statements | view | 1847 |
| extensions | pg_stat_statements_info | view | 113 |
| panol | order_items | view | 237 |
| panol | v_boxes_en_vivo | view | 1223 |
| panol | v_coord_kanban_progreso | view | 8692 |
| panol | v_coord_kanban_terminados | view | 11180 |
| panol | v_coord_unit_tasks | view | 1447 |
| panol | v_devoluciones_nuevas | view | 2686 |
| panol | v_devoluciones_pendientes | view | 4663 |
| panol | v_flota_busqueda | view | 5104 |
| panol | v_kpis_taller_diario | view | 533 |
| panol | v_monitor_pedidos | view | 3265 |
| panol | v_operario_tasks | view | 814 |
| panol | v_ots_anteriores | view | 1033 |
| panol | v_pedidos_canjes_consolidada | view | 1063 |
| panol | v_recursos_operarios | view | 708 |
| panol | v_staff_holds | view | 1179 |
| panol | v_stock_movements | view | 915 |
| panol | v_tablero_coordinacion | view | 863 |
| panol | v_taller_flota_ot | view | 245 |
| panol | v_taller_unit_tasks | view | 1180 |
| public | panol_items | view | 191 |
| public | panol_order_items | view | 233 |
| public | panol_orders | view | 304 |
| public | panol_staff | view | 133 |
| public | panol_stock_movements | view | 192 |
| public | panol_work_order_tasks | view | 223 |
| public | panol_work_orders | view | 137 |
| public | v_canon_chofer_operativo | view | 3608 |
| public | v_canon_flota_estado | view | 2438 |
| public | v_canon_novedades_activas | view | 749 |
| public | v_coord_kanban_progreso | view | 625 |
| public | v_coord_kanban_terminados | view | 642 |
| public | v_coord_unit_tasks | view | 412 |
| public | v_staff_holds | view | 377 |
| public | v_stock_movements | view | 506 |
| public | view_calendario_diagrama_km | view | 1020 |
| public | view_calendario_diagrama_km_12m | view | 1063 |
| public | view_calendario_diagrama_km_2m | view | 1215 |
| public | view_dash_flota | view | 2443 |
| public | view_dash_libres | view | 1288 |
| public | view_dash_novedades | view | 3032 |
| public | view_dash_retorno | view | 451 |
| public | view_dash_usuarios | view | 99 |
| public | view_dashboard_kpis | view | 1780 |
| public | view_diagrama_mensual | view | 385 |
| public | view_diaria_operativa | view | 4146 |
| public | view_flota_operativa | view | 2600 |
| public | view_individual_chofer | view | 1905 |
| public | view_movimientos | view | 2391 |
| public | view_personal_retorno | view | 443 |
| vault | decrypted_secrets | view | 387 |

### Conexiones activas por aplicación y estado

| app | usuario | estado | n | max_en_estado |
| --- | --- | --- | --- | --- |
| Supavisor | postgres | idle | 11 | -00:00:08.727414 |
| PostgREST 14.5 | authenticator | idle | 7 | 41 days 03:45:33.659534 |
| realtime_subscription_manager_pub | supabase_admin | idle | 2 | -00:00:15.443413 |
| Supabase Storage API | supabase_storage_admin | idle | 2 | 00:06:17.820926 |
| realtime_connect | supabase_admin | idle | 2 | -00:00:14.359379 |
| realtime_replication_connection | supabase_admin | active | 1 | 03:56:02.430877 |
| realtime_rls | supabase_admin | idle | 1 | -00:00:15.214848 |
| realtime_subscription_manager | supabase_admin | idle | 1 | -00:00:15.354434 |
| (sin nombre) | pgbouncer | idle | 1 | -00:00:14.283301 |
| Supavisor (auth_query) | pgbouncer | idle | 1 | -00:00:15.588514 |
| (sin nombre) | supabase_admin | idle | 1 | 02:06:17.955438 |
| pg_cron scheduler | supabase_admin |  | 1 |  |
| pg_net 0.20.4 | postgres | idle | 1 | 41 days 03:51:26.167252 |
| postgres_exporter | supabase_admin | idle | 1 | -00:00:05.358113 |

### Transacciones abiertas > 30 s

_(sin filas)_

## 3. Diagnóstico Estático de Código Multi-Proyecto

> Proyectos analizados: dash

### Tablas referenciadas en código

| tabla | menciones |
| --- | --- |
| choferes | 7 |
| novedades | 7 |
| chofer_documentacion | 3 |
| tipos_novedad | 3 |
| terminales | 3 |
| servicios_choferes | 3 |
| dash | 3 |
| chofer_observaciones | 2 |
| unidades | 2 |
| view_dash_novedades | 2 |
| dash_menciones | 2 |
| view_dash_flota | 1 |
| view_dash_retorno | 1 |
| view_dash_usuarios | 1 |
| tractores | 1 |

### SELECT * / .select("*") — 8 ocurrencias

```text
[dash] backend/routes/dash.js:385  supabase.from('chofer_documentacion').select('*').eq('chofer_id', choferId).maybeSingle(),
[dash] backend/routes/dash.js:386  supabase.from('chofer_observaciones').select('*').eq('chofer_id', choferId).order('fecha', { ascending: false 
[dash] backend/utils/googleSheetsSync.js:208  .select('*')
[dash] backend/utils/supabase.js:37  .select('*')
[dash] backend/utils/supabase.js:64  .select('*')
[dash] backend/utils/supabase.js:80  .select('*');
[dash] backend/utils/supabase.js:95  .select('*');
[dash] backend/utils/supabase.js:110  .select('*')
```

### Polling (refetchInterval / setInterval) — 15 ocurrencias

```text
[dash] backend/server.js:214  setInterval(async () => {
[dash] frontend/src/components/layout/Header.tsx:41  const interval = setInterval(actualizarReloj, 1000);
[dash] frontend/src/hooks/useAutoScroll.ts:46  const interval = setInterval(() => {
[dash] frontend/storybook-static/assets/DocsRenderer-JROSPFPF-BJEqwaR6.js:651  `});let $=s.versions&&Object.keys(s.versions).length?s.versions:m.versions;await i.setRef(u,{id:u,url:b.url,..
[dash] frontend/storybook-static/assets/iframe-CYOCVoz_.js:334  `),Object.keys(s).length>0&&c.push(s);let u=i+"By"+e;return{queryName:e,queryMethod:u,queryArgs:c,variant:i,wa
[dash] frontend/storybook-static/sb-addons/chromatic-com-storybook-1/manager-bundle.js:99  `),U4=({createdProjectId:e,setCreatedProjectId:t,onUpdateProject:n})=>{let r=a.useCallback(async i=>{await n(i
[dash] frontend/storybook-static/sb-addons/chromatic-com-storybook-1/manager-bundle.js:364  `),B7=({projectId:e,storyId:t,gitInfo:n,selectedBuildInfo:r})=>{let[{data:i,error:l,operation:o},s]=Dl({query:
[dash] frontend/storybook-static/sb-addons/vitest-2/manager-bundle.js:2  (()=>{function ae(e){if(!e||typeof e!="object")return!1;let t=Object.getPrototypeOf(e);return t===null||t===Ob
[dash] frontend/storybook-static/sb-manager/globals-runtime.js:53902  intervalId = setInterval(checkRealTimersCallback, interval);
[dash] frontend/storybook-static/sb-manager/globals-runtime.js:60971  let startTime = Date.now(), maxDuration = 500, intervalId = setInterval(() => {
[dash] frontend/storybook-static/sb-manager/runtime.js:11321  let intervalId = window.setInterval(() => {
[dash] frontend/storybook-static/sb-manager/runtime.js:17551  this.floaterRefInterval = setInterval(function() {
[dash] frontend/storybook-static/sb-manager/runtime.js:19302  this._intervalId === null && (this._intervalId = setInterval(() => {
[dash] frontend/storybook-static/sb-manager/runtime.js:22050  let childWindow = globalWindow2.open(loginUrl, `storybook_auth_${id}`, "resizable,scrollbars"), timer = setInt
[dash] frontend/storybook-static/sb-manager/runtime.js:22246  ), timer = setInterval(() => {
```

### Polling sin pausa en background (falta refetchIntervalInBackground: false) — 0 ocurrencias

### Llamada directa cliente frontend a Supabase PostgREST — 12 ocurrencias

```text
[dash] backend/routes/dash.js:341  let query = supabase.from('choferes').select('id, nombre, dni, legajo');
[dash] backend/routes/dash.js:521  await supabase.from('choferes').update({ unidad_id: null, estado: 'inactivo', actualizado_el: new Date().toISO
[dash] backend/routes/dash.js:523  await supabase.from('choferes').update({ unidad_id: targetUnidadId, estado: 'circulando', actualizado_el: new 
[dash] backend/utils/googleSheetsSync.js:207  .from('view_dash_novedades')
[dash] backend/utils/googleSheetsSync.js:276  .from('choferes')
[dash] backend/utils/supabase.js:63  .from('view_dash_novedades')
[dash] backend/utils/supabase.js:79  .from('view_dash_flota')
[dash] backend/utils/supabase.js:94  .from('view_dash_retorno')
[dash] backend/utils/supabase.js:143  .from('view_dash_usuarios')
[dash] backend/utils/supabase.js:169  .from('choferes')
[dash] backend/utils/supabase.js:286  .from('choferes')
[dash] backend/utils/supabase.js:441  .from('choferes')
```

### Suscripciones Realtime (postgres_changes / .channel) — 3 ocurrencias

```text
[dash] backend/utils/supabase.js:589  .channel('backend-dash-realtime')
[dash] backend/utils/supabase.js:590  .on('postgres_changes', {
[dash] backend/utils/supabase.js:598  .on('postgres_changes', {
```

### Cache TTL (staleTime / gcTime / cacheTime / TTL) — 0 ocurrencias

### Transacciones explícitas (BEGIN/COMMIT, getClient, db.transaction) — 0 ocurrencias

### Locks de fila (SELECT ... FOR UPDATE / SKIP LOCKED) — 1 ocurrencias

```text
[dash] frontend/storybook-static/sb-manager/runtime.js:4637  return react_default.createElement(Container2, null, react_default.createElement("strong", null, "You are on S
```

### Ráfagas async (Promise.all con map/forEach async) — 3 ocurrencias

```text
[dash] frontend/storybook-static/assets/DocsRenderer-JROSPFPF-BJEqwaR6.js:641  `);return O.push(I),O},[]);return A.forEach((O,C)=>{let P=A[C+1]||x.id;_.length&&C===0?S[O]=sn(S[O]||{},{type:
[dash] frontend/storybook-static/assets/DocsRenderer-JROSPFPF-BJEqwaR6.js:744  ${Yd(.02,e.input.background)} 100%)`,borderRadius:6,boxShadow:`${e.base=="dark"?"hsl(0 0 100 / 0.4)":"hsl(0 0 
[dash] frontend/storybook-static/sb-addons/chromatic-com-storybook-1/manager-bundle.js:2  (()=>{var Ht=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?requi
```

### RPC / upsert compuestas — 1 ocurrencias

```text
[dash] backend/utils/supabase.js:527  .upsert({
```

### Caché en Hot RAM (backend in-memory datasets) — 0 ocurrencias

### Wipe de tabla en ETL (DELETE FROM sin WHERE o TRUNCATE) — 13 ocurrencias

```text
[dash] frontend/src/components/kanban/NoveltyCard.tsx:255  <h3 className="font-extrabold text-black text-[14px] leading-tight uppercase truncate tracking-tight flex-1 pr
[dash] frontend/src/components/kanban/NoveltyCard.tsx:416  <span className="truncate max-w-[80px] font-black">{novedad.creador || novedad.usuario || 'OPERADOR'}</span>
[dash] frontend/src/components/kanban/NoveltyCard.tsx:525  } text-sm sm:text-base leading-tight uppercase truncate flex-1 pr-2 tracking-tight`}
[dash] frontend/src/components/kanban/QuickAddLibre.tsx:128  <div className="flex flex-col truncate pr-2">
[dash] frontend/src/components/kanban/QuickAddLibre.tsx:129  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate uppercase">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:149  <span className="flex-1 truncate pr-1">Conductor</span>
[dash] frontend/src/components/kanban/ReturnColumn.tsx:179  <div className="flex flex-col truncate flex-1 min-w-0 pr-1">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:180  <span className="font-black text-xs text-slate-900 dark:text-slate-100 truncate uppercase">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:214  <div className="flex flex-col truncate flex-1 min-w-0 pr-1">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:215  <span className="font-black text-xs text-slate-900 dark:text-slate-100 truncate uppercase">
[dash] frontend/src/components/modals/NoveltyModal.tsx:319  <h2 className="text-sm font-black uppercase tracking-wide text-center truncate mx-2 flex-1">
[dash] frontend/storybook-static/assets/NoveltyCard.stories-Ceb3bdpF.js:1  import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{R as C,r as p}from"./iframe-CYOCVoz_.js";import"./preload
[dash] frontend/storybook-static/assets/ReturnColumn.stories-BIlNT7YK.js:1  import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as f}from"./iframe-CYOCVoz_.js";import"./preload-helper
```
