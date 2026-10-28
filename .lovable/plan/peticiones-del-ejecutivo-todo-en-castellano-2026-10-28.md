# Peticiones del ejecutivo (todo en castellano)

## Qué pide (resumen)
1. Tabla de **gastos de producción** en cada proyecto de compositor/a.
2. **Modelo económico** por proyecto: cuánto se factura a la productora y cómo cobra la agencia.
3. **Productoras partners**: ver las películas hechas con cada productora.
4. **Documentos vinculados**: poder añadir un enlace o subir un archivo (ahora no deja hacer nada).

## 1. Gastos de producción
Columnas, en este orden: **Concepto · Proveedor** · Presupuestado (€) · % presupuesto · Coste real (€) · % coste real · Desviación (€). Fila TOTAL abajo.
- **Concepto** y **Proveedor**: se escriben a mano; lo que ya se ha escrito antes aparece en un desplegable para elegirlo (sin duplicados).
- Los porcentajes y la desviación (real − presupuestado) se calculan solos; en rojo si se pasa del presupuesto.
- Los gastos que ya existen se conservan como "coste real". No se borra nada.

## 2. Modelo económico del proyecto (ficha del proyecto)
- **Precio negociado**: lo que se factura a la productora.
- **Modelo de comisión de la agencia**, a elegir:
  - % sobre el **precio negociado**, o
  - % sobre el **margen del compositor** (precio negociado − coste real de los gastos).
- **% de la agencia**.
- En la ficha del compositor/a se podrá guardar su modelo y % por defecto. Al crear un proyecto se copia automáticamente, pero se puede cambiar en cada proyecto si hay un acuerdo específico.
- Resultado visible junto a la tabla de gastos: total gastos, margen del compositor, **comisión de la agencia** y lo que le queda al compositor. Esta comisión alimenta el panel de comisiones por proyecto.

## 3. Películas de cada productora partner
- En la ficha de la productora, sección «Películas con nosotros»: título, compositor/a, año y estado, con acceso a la producción.

## 4. Documentos vinculados
- El botón «Vincular documento» ofrecerá tres opciones: **pegar un enlace**, **subir un archivo** o elegir uno ya existente en la app.
- Cada documento muestra su tipo, título y se abre con un clic (los enlaces en pestaña nueva).

## Detalles técnicos
- `production_expenses`: añadir `budget_amount` (nullable); `amount` = coste real; desplegables a partir de valores distintos de `concepto` y `provider_name`.
- `productions`: añadir `commission_basis` ('precio' | 'margen', nullable); se reutilizan `fee_amount` e `ic_commission_pct`; `ic_commission` se calcula a partir de la base elegida.
- `composers`: añadir `default_commission_basis` y `default_commission_pct` (nullable); se copian al crear producción.
- Productoras: listar producciones por la relación existente productora ↔ producción.
- Documentos: `production_documents` ya tiene `url` y `storage_path`; añadir pestañas Enlace/Subir en el diálogo y bucket privado con URLs firmadas.
- Todos los cambios son aditivos; no se borran datos.
