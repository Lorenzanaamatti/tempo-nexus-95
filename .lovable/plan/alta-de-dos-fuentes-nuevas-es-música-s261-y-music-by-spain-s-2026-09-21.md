# Alta de dos fuentes nuevas: ES_MÚSICA (S261) y MUSIC BY SPAIN (S262)

## Formato que necesito para próximas fuentes

El mismo texto que acabas de pegar es suficiente: una ficha por fuente con las etiquetas en mayúsculas (`ID SUGERIDO`, `PRIORIDAD`, `CATEGORÍA`, `FUENTE / ENTIDAD`, `TERRITORIO`, `TIPOS DE OPORTUNIDAD`, `BENEFICIARIOS HABITUALES`, relevancias, `MÉTODO DE CONEXIÓN`, `NIVEL AUTOMATIZACIÓN`, `FRECUENCIA RECOMENDADA`, `URL CONVOCATORIAS / PORTAL`, `URL TÉCNICA`, `NOTAS TÉCNICAS`, `VERIFICACIÓN`). Con pegarlo en el chat (o subir un .txt) puedo dar de alta las fuentes sin volver a generar el Excel.

## Qué se hará ahora

1. **Dar de alta S261 (Es_Música)** y **S262 (Music by Spain)** en la sección Subvenciones con todos los campos de la ficha: prioridad P1, categoría, territorio, cobertura, tipos de oportunidad, beneficiarios, relevancias, qué aporta, limitaciones, método de conexión, nivel de automatización (B), frecuencia, URL del portal y notas.
2. **Activar la vigilancia** de ambas (P1 + nivel B ⇒ vigiladas automáticamente, como el resto de fuentes P1/P2 automatizables).
3. **Lanzar una primera revisión real** de las dos páginas para comprobar que responden y dejar registrada su huella, y confirmarte el resultado.

## Detalle técnico

- Migración SQL con `INSERT ... ON CONFLICT (source_id) DO UPDATE` sobre `subv_fuentes`, igual que la carga de las 150 fuentes anteriores; sin tocar esquema ni RLS.
- La vigilancia usa el conector web existente (detección de cambios en la página), ya que ninguna de las dos fuentes tiene API pública.
