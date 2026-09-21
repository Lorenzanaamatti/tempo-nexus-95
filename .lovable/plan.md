# Ampliar el mapa de fuentes de Subvenciones

El Excel subido (actualizado a 20/09/2026) contiene **260 fuentes**, **97 programas clave** y **35 taxonomías**. La sección actual tiene 110 fuentes (S001–S110), 73 programas y 35 taxonomías.

Comprobado: los identificadores son estables — S001–S110 coinciden con las fuentes ya cargadas, y **S111–S260 son 150 fuentes nuevas** (49 de CCAA empresa y cultura, 24 fundaciones privadas, 24 de Cataluña, 20 de ecosistema privado, 9 de cultura privada, 8 de mujeres, y el resto agregadores, ministerios y organismos).

## Qué se hará

1. **Incorporar las 150 fuentes nuevas** con todos sus datos: prioridad, categoría, territorio, cobertura, tipos de oportunidad, beneficiarios, relevancia (empresa / cultura / mujeres / tecnología), qué aporta, limitaciones, método de conexión, nivel de automatización, frecuencia recomendada, enlaces al portal y al canal técnico, notas y verificación.
2. **Actualizar las 110 existentes** con la versión revisada del Excel, sin tocar su historial de vigilancia (último chequeo, estado de salud, errores) ni su marca de "vigilada".
3. **Completar los programas clave**: pasar de 73 a los 97 del archivo, vinculados a su fuente.
4. **Refrescar las taxonomías** (35 valores) para que los desplegables y criterios coincidan con el documento.

## Criterio de vigilancia para las nuevas

Se activarán automáticamente (quedarán "vigiladas") las fuentes nuevas de **prioridad P1 y P2 con conexión automatizable (nivel A o B)**; las de nivel C, que exigen revisión manual, quedarán catalogadas pero no vigiladas. Todas se pueden activar o desactivar a mano desde la pantalla Fuentes.

## Después de cargar

- La pantalla **Fuentes** mostrará las 260 con su filtro de prioridad.
- Se lanzará una captura real para comprobar que las fuentes nuevas vigiladas responden, y te diré cuántas convocatorias nuevas aparecen y cuántas se han analizado.

## Detalle técnico

- Migración SQL con `INSERT ... ON CONFLICT (source_id) DO UPDATE` sobre `subv_fuentes`, excluyendo de la actualización `activa`, `last_checked_at`, `last_success_at`, `last_change_at`, `health_status`, `last_error`, `content_hash`.
- `subv_programas` y `subv_taxonomias` se recargan desde el archivo (borrado y reinserción de las filas provenientes del mapa).
- Sin cambios de esquema ni de RLS; el panel y los cron actuales siguen igual.
