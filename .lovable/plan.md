# Una sola ficha de producción

## Qué pasa ahora

Desde la ficha del compositor (Proyectos y oportunidades > Activas) se abre una **pantalla antigua** de la producción. Desde Producciones > Producciones activas se abre la **pantalla nueva**. Las dos muestran el mismo proyecto y guardan los mismos datos, pero cada una enseña cosas distintas.

## Diferencias

| Apartado | Pantalla antigua (desde el compositor) | Pantalla nueva (Producciones activas) |
|---|---|---|
| Estado del proyecto | Desplegable «Estado» | Etapa (activa / finalizada) con cierre de producción |
| Representado | Un único «Representado principal» | «Compositores y equipo»: varios, representados o no, y una ficha propia por representado |
| Productora | Una sola | Varias, con una principal |
| Director | Uno solo | Varios, con uno principal |
| Fechas | Entrega, estreno, nominación, premio | Inicio de rodaje, entrega estimada, entrega real, estreno |
| País e idioma | No | Sí |
| Enlace IMDb | Sí | No |
| Compositor externo (texto) | Sí | Se sustituye por «Compositores y equipo» (no representado) |
| Director de producción, responsable de postproducción, supervisor musical, otros responsables | Sí | No (el supervisor se puede añadir en «Compositores y equipo») |
| Responsable de negociación | Sí | No |
| Aclaración de producción especial | Sí | No |
| Dinero | Fee, % y comisión IC | Precio negociado, modelo (sobre precio o sobre margen), %, comisión calculada |
| Gastos de producción | No | Sí, con presupuesto, coste real y desviación |
| Facturas y sprints de facturación | No | Sí |
| Procesos y Gantt | Sí | Sí, con paleta de color por película |
| Personal IC asignado (con fechas) | Sí | No |
| Documentos | Documentos asociados | Documentos vinculados: enlaces, archivos, contratos y deal memos |
| Tareas vinculadas | No | Sí |
| Oportunidad de origen | No | Sí |
| Eventos en el calendario | Sí | Sí |
| Actividad en redes sociales | Sí | No |
| Autoguardado y aviso de «otra ficha» | Solo autoguardado | Sí, los dos |

## Propuesta

1. Los enlaces de la ficha del compositor (y de cualquier otro sitio) abrirán la pantalla nueva.
2. A la pantalla nueva se le añaden los campos útiles que hoy solo están en la antigua:
   - Enlace IMDb
   - Fechas de nominación y de premio
   - Responsable de negociación
   - Director de producción, responsable de postproducción y otros responsables
   - Aclaración de producción especial
   - Personal IC asignado
   - Actividad en redes sociales
3. La pantalla antigua deja de usarse. Si alguien entra por un enlace guardado, se le lleva automáticamente a la nueva. No se borra ningún dato: todos esos campos ya están guardados en el mismo proyecto.

## Detalles técnicos

- Cambiar los enlaces `/productions/$productionId` por `/producciones/$productionId` en la ficha del compositor y en el resto de la app (buscar en todo el código).
- En `producciones.$productionId.tsx`, añadir al formulario y al guardado: `imdb_url`, `nomination_date`, `award_date`, el responsable de negociación, los responsables de producción y postproducción, `other_responsibles` y la aclaración. Añadir también los apartados «Personal asignado» y «Actividad en redes sociales», reutilizando los componentes de la ruta antigua.
- `productions.$productionId.tsx`: redirigir a la ruta nueva conservando el id.
- Los campos nuevos también entran en la pregunta de «¿actualizar también en la otra ficha?».
