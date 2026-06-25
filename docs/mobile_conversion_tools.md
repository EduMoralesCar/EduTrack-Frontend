# 🛠️ Herramientas de Conversión de Aplicación Web a Aplicación Móvil

Este documento describe la pila tecnológica y el flujo de herramientas de software utilizados para portar y transformar el cliente web SPA desarrollado en React en una aplicación móvil nativa para dispositivos Android.

---

## 📱 Concepto de Aplicaciones Híbridas (WebView)

EduTrack móvil está estructurado bajo un enfoque de **desarrollo híbrido**. Esto significa que toda la interfaz gráfica y la lógica de presentación están escritas con tecnologías web estándar (React, HTML5, CSS3, JavaScript). 

Al compilarse para móviles, la aplicación se ejecuta dentro de un **WebView** nativo seguro. Un WebView es un navegador web optimizado e integrado de forma interna en la aplicación Android. Esto garantiza que el diseño visual, las animaciones y la lógica de negocio se comporten de manera idéntica tanto en navegadores web de escritorio como en smartphones, maximizando la reutilización del código.

---

## ⚡ CapacitorJS: El Puente Nativo

Para realizar la compilación móvil y dar acceso a características nativas, se utiliza **CapacitorJS** (desarrollado por el equipo de Ionic).

### ¿Qué es Capacitor?
Capacitor es un motor de ejecución (*runtime*) de código abierto que actúa como un puente (*bridge*) bidireccional asíncrono entre el código JavaScript (React) y las APIs nativas del sistema operativo Android (como el sistema de archivos local, almacenamiento, notificaciones, cámara y el gestor de red).

### Diferencias Clave frente a Tecnologías Anteriores (ej. Cordova)
- **Proyecto Nativo Real:** Capacitor no oculta el proyecto de Android. Genera una estructura de proyecto de Android real dentro del directorio `/android` que puede abrirse, compilarse y modificarse directamente en Android Studio.
- **Herramientas Estándar:** Utiliza Gradle para gestionar las dependencias de Java/Kotlin y Android Studio como la herramienta oficial de compilación y firma digital del APK final.

---

## 📂 Archivos Clave del Ecosistema Móvil

1. **`capacitor.config.json` (Raíz del Frontend):**
   Contiene la configuración de inicialización del puente móvil:
   ```json
   {
     "appId": "com.utp.edutrack",
     "appName": "EduTrack",
     "webDir": "dist"
   }
   ```
   * *`appId`:* El identificador único del paquete de la aplicación en el sistema Android (Package Name).
   * *`appName`:* Nombre comercial de la aplicación visible en el teléfono del usuario.
   * *`webDir`:* La carpeta donde se almacena el bundle compilado de React (Vite compila en `dist`).

2. **Directorio `/android`:**
   Contiene el proyecto nativo Gradle de Android generado y actualizado por Capacitor. Aquí se encuentra el archivo `AndroidManifest.xml` (para la solicitud de permisos al sistema operativo) y los recursos como los íconos de la app (`res/mipmap`).

---

## 🚀 Flujo de Trabajo y Comandos de Compilación

Para propagar cualquier cambio visual o funcional desde el código fuente en React hacia la aplicación móvil, se sigue el siguiente flujo de trabajo:

### Paso 1: Compilar el Frontend Web
Se compila y optimiza la Single Page Application (React) generando los archivos estáticos en la carpeta `dist`:
```bash
npm run build
```

### Paso 2: Sincronizar con el Proyecto Android (`cap sync`)
Se copian los recursos del directorio `dist` a la carpeta de assets nativos de Android y se actualizan los plugins nativos de Capacitor:
```bash
npm run cap:sync
# Ejecuta de forma interna: npx cap sync
```

### Paso 3: Abrir e Instalar desde Android Studio
Se abre el directorio nativo en Android Studio para su posterior compilación del paquete APK o depuración directa:
```bash
npx cap open android
```
Esto lanzará automáticamente Android Studio cargando el proyecto Gradle ubicado en la carpeta `android`.
