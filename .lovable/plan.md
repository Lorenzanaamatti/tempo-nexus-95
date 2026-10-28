# Gastos de producción: ajustar a la tabla del ejecutivo

## Comparación (tabla pedida vs. pantalla actual)

| Pedido | Ahora | Problema |
|---|---|---|
| Concepto · Proveedor juntos | Sí, pero con mucho hueco vacío entre columnas | Columnas descompensadas, cuadros de importe enormes |
| % presupuesto | 100 % en todas las filas | Se calcula sobre el total de gastos, así que con una fila siempre da 100 % y no dice nada. Debe ser % sobre el precio negociado con la productora |
| % coste real | 100 % | Mismo error: debe ser % sobre el precio negociado |
| Desviación | -4,00 € en rojo | Gastar menos de lo presupuestado sale en rojo. El rojo debe ser solo cuando se pasa del presupuesto; el ahorro en verde aguacate |
| Cálculo de la comisión de la agencia (sobre margen o sobre precio) | No aparece | El bloque solo se muestra si el proyecto tiene precio negociado; si falta, desaparece sin avisar |
| Fila TOTAL | Sí | Correcta |

## Cambios

1. **Porcentajes con sentido:** % presupuesto = presupuestado ÷ precio negociado; % coste real = coste real ÷ precio negociado. Si falta el precio, se muestra «—» con aviso.
2. **Colores de desviación:** rojo solo si el coste real supera lo presupuestado; verde si es menor.
3. **Bloque de comisión siempre visible** bajo la tabla: Precio negociado · Total gastos · Margen del compositor · Comisión agencia (indicando «X % sobre margen» o «sobre precio») · Neto compositor. Si falta el precio o el %, un aviso con botón para rellenarlo en Datos económicos.
4. **Maquetación:** columnas en el orden del Excel (Concepto, Proveedor, Presupuestado, % presupuesto, Coste real, % coste real, Desviación), anchos equilibrados, importes editables compactos alineados a la derecha.

No se borra ningún dato existente.

## Detalle técnico
- `src/components/production-detail/production-expenses.tsx`: cambiar `pct(b, totalBudget)` / `pct(c, totalReal)` por base `feeAmount`; quitar condición `feeAmount != null` del bloque de comisión y añadir estados vacíos; clase de color según signo de desviación (coste − presupuesto > 0 → destructive).
- Ajustar `<colgroup>` y ancho de inputs.
