# 📱 Guía de Instalación de la App Móvil en Dispositivo Android Físico

Esta guía describe el procedimiento paso a paso para instalar, depurar y ejecutar la aplicación móvil **EduTrack** en un teléfono inteligente Android real utilizando **Android Studio**, a través de conexión por cable USB o de forma inalámbrica mediante Wi-Fi.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de contar con los siguientes elementos configurados:

1. **Android Studio:** Instalado en tu computadora.
2. **SDK de Android:** Configurado con soporte mínimo para API 26 (Android 8.0 Oreo) o superior.
3. **Cable USB:** Un cable de datos de buena calidad (para el método de conexión cableada).
4. **Red Wi-Fi Común:** Ambas partes (computadora y teléfono) deben estar conectadas a la misma red Wi-Fi local (para el método inalámbrico).

### ⚙️ Activar el Modo Desarrollador en el Teléfono
1. Abre los **Ajustes** o **Configuración** de tu teléfono Android.
2. Navega a **Acerca del teléfono** (o *Información del sistema*).
3. Busca la opción **Número de compilación** (en dispositivos Xiaomi es *Versión de MIUI*) y presiónala **7 veces consecutivas**.
4. Verás un mensaje en pantalla indicando: *"¡Ahora eres desarrollador!"*.

### 🔓 Activar la Depuración USB
1. Regresa al menú principal de **Ajustes** y busca **Opciones de desarrollador** (suele encontrarse dentro de *Ajustes adicionales* o *Sistema*).
2. Entra en Opciones de desarrollador y activa la opción **Depuración por USB**.
3. Acepta el mensaje de advertencia de seguridad de Android.

---

## 🔌 Método 1: Conexión mediante Cable USB (Fácil y Rápido)

1. **Conecta el teléfono a la computadora:** Conéctalos mediante el cable USB.
2. **Configura el modo USB:** En el teléfono, despliega la barra de notificaciones, presiona en la notificación de USB y selecciona la opción **Transferencia de archivos** (o *Android Auto*).
3. **Autoriza la Depuración:** Aparecerá una ventana flotante en el teléfono preguntando: *¿Permitir depuración por USB?*. Marca la casilla **"Permitir siempre desde esta computadora"** y presiona **Aceptar**.
4. **Verificación en Android Studio:**
   * Abre Android Studio y carga el proyecto móvil en la carpeta `android`.
   * En la barra de herramientas superior de Android Studio, localiza el selector de dispositivos (Device Manager / Device Selector).
   * Deberás ver listado el modelo de tu teléfono físico (ej. *Samsung SM-G991B*, *Xiaomi Redmi Note 11*, etc.).
5. **Ejecutar e Instalar:**
   * Selecciona tu teléfono de la lista.
   * Haz clic en el botón verde **Run (▷)** o presiona `Shift + F10` en tu teclado.
   * Android Studio compilará el código y cargará automáticamente la aplicación en tu celular.

---

## 📶 Método 2: Conexión Inalámbrica vía Wi-Fi (Android 11 o Superior)

*Nota: Este método requiere que el celular cuente con Android 11 o superior y que ambos equipos estén en la misma red Wi-Fi.*

1. **Activar Depuración Inalámbrica:**
   * En tu teléfono, ve a **Opciones de desarrollador**.
   * Busca la opción **Depuración inalámbrica** (Wireless Debugging) y actívala.
   * Presiona sobre la etiqueta "Depuración inalámbrica" para entrar a su pantalla de emparejamiento.
2. **Abrir Emparejamiento en Android Studio:**
   * En Android Studio, en la lista desplegable de dispositivos de la barra superior, haz clic en **"Pair Devices Using Wi-Fi"**.
   * Se abrirá una ventana emergente que mostrará un código QR y una pestaña con opciones para usar un código de 6 dígitos.
3. **Vincular Dispositivos:**
   * **Opción A (Código QR - Recomendada):** En el teléfono, presiona la opción **"Vincular dispositivo con código QR"** y escanea el código QR proyectado en la pantalla de la computadora.
   * **Opción B (Código de Emparejamiento):** En el teléfono, presiona **"Vincular con código de emparejamiento"**. Te dará un código numérico y una dirección IP. En Android Studio, introduce este código para emparejar.
4. **Ejecutar e Instalar:**
   * Una vez emparejado, tu teléfono aparecerá en la lista de dispositivos de Android Studio con una marca verde indicando conexión Wi-Fi activa.
   * Selecciónalo y haz clic en el botón verde **Run (▷)** para instalar la aplicación de forma inalámbrica.
