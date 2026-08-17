# Ranking de Bolsas — Firebase

Web completa en HTML/CSS/JavaScript usando Firebase Authentication, Firestore y Storage.

## Incluye

- 5 tablas: `20 Bolsas`, `16 Bolsas`, `12 Bolsas`, `8 Bolsas`, `6 Bolsas`.
- Flechas laterales para cambiar de tabla.
- Ranking ordenado automáticamente por dinero, de mayor a menor.
- Solo se muestra posición y nombre.
- Botón de acceso oculto en la esquina superior derecha.
- Login/registro con Firebase Authentication.
- Con sesión iniciada:
  - `+ Añadir persona` en la tabla actual.
  - `+` junto a cada persona para sumar dinero.
  - Subida de foto opcional.
- Usuario cuyo `displayName` sea exactamente `Carlos` (sin distinguir mayúsculas) ve `Resetear dinero`.
- El reset pone el dinero a 0 y conserva nombres/fotos.

## Configuración de Firebase

1. En Firebase Console, activa Authentication → Sign-in method → Email/Password.
2. Crea Firestore Database.
3. Publica las reglas de `firestore.rules`.
4. Activa Storage y publica `storage.rules`.
5. Sirve la carpeta con un servidor local o súbela a Firebase Hosting.

## Importante sobre Carlos

La interfaz identifica a Carlos por `displayName`. Para un entorno real con varios administradores, es mejor proteger el reset mediante Custom Claims (`admin: true`) y una Cloud Function/endpoint administrativo. La regla incluida permite actualizaciones a cualquier usuario autenticado, por lo que es adecuada como prototipo, no como control de acceso de producción.

## Ejecutar localmente

Puedes usar cualquier servidor estático, por ejemplo:

```bash
python -m http.server 5500
```

Luego abre `http://localhost:5500`.

No abras `index.html` directamente con `file://`, porque los módulos ES y Firebase pueden fallar.

## Nota de seguridad

La configuración web de Firebase (incluida la apiKey) no funciona como una contraseña secreta. La seguridad real depende de Authentication y de las reglas de Firestore/Storage. Nunca publiques credenciales de servicio (`service account`) en el navegador.
