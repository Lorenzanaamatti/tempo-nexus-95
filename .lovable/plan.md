# Aceptado en «Quiero fichar a» pasa al roster

## Qué verás
- En «Quiero fichar a», al cambiar el estado de una persona a **ACEPTADO**, se crea su ficha en el roster con estado **Contratado**.
- Va al roster de **compositores** o de **supervisores** según su campo **Perfil** (si pone «supervisor» va a supervisores; en cualquier otro caso, compositores).
- Si ya tiene ficha en el roster (mismo nombre o ya vinculada), no se duplica: se usa esa ficha y se pone como Contratado.
- La persona **desaparece** de «Quiero fichar a» (no se borra: queda guardada como aceptada y oculta de la lista).
- Aviso en pantalla: «X añadido al roster de compositores/supervisores», con enlace a su ficha.
- Ciudad, país, notas y fecha de primer contacto pasan a la nueva ficha.

## Detalles técnicos
- Lógica en el servidor (trigger en `roster_prospects` al pasar a aceptado): busca o crea en `composers` con el `roster_role` adecuado y `representation_status` contratado, y guarda el enlace en el prospecto.
- La lista filtra los aceptados; no se elimina ningún registro.
- Prueba: pasar un prospecto de prueba a Aceptado, comprobar ficha creada y ocultación, y limpiar solo la prueba.
