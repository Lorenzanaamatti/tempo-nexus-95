# Peticiones del ejecutivo (todo en castellano)

## Qué pide (traducido)
1. **Tabla de gastos de producción** en cada proyecto de compositor/a, con estas columnas: Concepto · Presupuestado (€) · % presupuesto · Coste real (€) · % coste real · Desviación (€) · Proveedor, y una fila TOTAL.
2. **Productoras partners**: al abrir una productora, ver la lista de películas en las que hemos trabajado con ella (ya se rellena la productora al registrar cada película).
3. **Enlaces**: "revisar lo de poder poner enlaces, que ahora no se podía". No dice dónde. **Hay que preguntarle en qué pantalla o campo.**

## 1. Gastos de producción
- Cada línea tendrá: concepto, importe presupuestado, coste real y proveedor (se conservan los gastos actuales como coste real, sin borrar nada).
- Se calculan solos: % sobre el presupuesto total, % sobre el coste real total y desviación (real − presupuestado), en rojo si se pasa del presupuesto.
- Fila TOTAL abajo. Formato euros español.

## 2. Películas de cada productora partner
- En la ficha de la productora, nueva sección «Películas con nosotros»: título, compositor/a, año y estado, con enlace a la producción.

## 3. Enlaces
- Pendiente de saber dónde. Cuando lo sepamos: campos de enlace que se puedan pulsar y abrir en otra pestaña.

## Detalles técnicos
- Añadir `budget_amount` (nullable) a `production_expenses`; `amount` sigue siendo coste real. Porcentajes y desviación se calculan en `production-expenses.tsx`.
- Listado de producciones filtrado por la productora en `partners.productoras.tsx` (vía relación productions ↔ production_companies/partners).
