# 📝 Guía de Estructura de GitHub Issues y Registro de Incidencias Resueltas

Este documento proporciona una guía paso a paso para estructurar incidencias (*GitHub Issues*) de manera profesional, y recopila el historial de problemas reales que hemos solucionado durante el desarrollo de **EduTrack** (tanto en Backend como en Frontend).

---

## 📋 Estructura Profesional de un GitHub Issue

Para registrar un problema (*bug*) o tarea de forma profesional, se recomienda seguir la siguiente plantilla estructurada:

1. **Título Claro y Conciso:** Usar prefijos descriptivos como `[BUG]`, `[HOTFIX]`, `[FEATURE]`. Ej: `[BUG] Duplicidad de registros en la tabla de asistencias`.
2. **Descripción del Problema:** Explicación narrativa de qué está fallando y cuál es el impacto en el negocio o experiencia de usuario.
3. **Gravedad (Severity):** Clasificar el impacto:
   * *Crítico (Critical):* Cuelga el sistema, corrompe datos o falla la seguridad.
   * *Alto (High):* Funcionalidad principal no operativa sin alternativa de solución.
   * *Medio (Medium):* Falla una función importante pero existe alternativa de uso temporal.
   * *Bajo (Low):* Detalle estético, error tipográfico o problema cosmético.
4. **Pasos para Reproducir (Steps to Reproduce):** Lista numerada con las acciones exactas para gatillar el error.
5. **Causa Raíz (Root Cause):** Análisis técnico de por qué ocurre el error en el código.
6. **Solución Implementada:** Explicación técnica de cómo se arregló (mencionando clases y lógica de código).
7. **Etiquetas (Labels):** Ej: `bug`, `backend`, `frontend`, `security`, `high-priority`.

---

## 🛠️ Historial de Issues del Backend (Spring Boot)

### 🐛 Issue #1: [BUG] Duplicidad de registros de asistencia de un estudiante en la misma sesión
* **Gravedad:** Alta (Afecta la consistencia estadística de la base de datos).
* **Descripción:** Si el docente presionaba rápidamente varias veces el botón de asistencia en el frontend, la API permitía insertar múltiples registros de asistencia (`Attendance`) para el mismo estudiante, en la misma sección y semana de clase.
* **Pasos para Reproducir:**
  1. Enviar múltiples peticiones HTTP `POST /api/attendance` concurrentes con el mismo `studentId`, `sectionId` y `weekNumber`.
  2. Verificar la base de datos: existen filas duplicadas de asistencia para la misma clase.
* **Causa Raíz:** Falta de validación lógica de existencia previa antes de ejecutar la persistencia en `AttendanceService.java`.
* **Solución Implementada:** Se agregó una validación de seguridad previa utilizando una consulta de verificación:
  ```java
  if (attendanceRepository.existsByStudentIdAndSectionIdAndWeekNumber(studentId, sectionId, weekNumber)) {
      throw new BusinessException("El registro de asistencia para este estudiante en la semana indicada ya existe.");
  }
  ```

---

### 🐛 Issue #2: [PERF] Problema de rendimiento N+1 en la consulta de justificaciones de asistencia (Hibernate)
* **Gravedad:** Media (Afecta la velocidad del servidor ante alta concurrencia).
* **Descripción:** Al listar la bandeja de justificaciones de inasistencia del docente, Hibernate ejecutaba una consulta SQL inicial para traer las justificaciones, y luego *N* consultas adicionales para recuperar la relación de asistencias asociadas de cada fila en la base de datos.
* **Causa Raíz:** Relación `@ManyToOne` cargada por defecto de forma perezosa (*Lazy*) sin un mapeo optimizado de combinación (*Join*).
* **Solución Implementada:**
  * Se reestructuró la consulta en `AttendanceJustificationRepository.java` utilizando un JOIN FETCH en JPQL para cargar el registro de asistencia y el estudiante en una sola transacción:
    ```sql
    @Query("SELECT j FROM AttendanceJustification j JOIN FETCH j.attendance a JOIN FETCH a.student s WHERE a.section.id = :sectionId")
    List<AttendanceJustification> findAllBySectionIdWithDetails(@Param("sectionId") Long sectionId);
    ```
  * Esto redujo el número de peticiones a la base de datos a una sola consulta SQL unificada.

---

### 🐛 Issue #3: [BUG] Fallo en carga de archivos por límites de tamaño e inyección de formatos no permitidos
* **Gravedad:** Alta (Riesgo de seguridad y almacenamiento).
* **Descripción:** Al subir archivos de evaluaciones (rúbricas) o materiales de clase, los usuarios podían subir archivos extremadamente grandes (más de 50MB) o archivos ejecutables maliciosos (`.exe`, `.bat`), provocando denegación de servicio (DoS) en el servidor.
* **Causa Raíz:** Falta de filtros de validación de archivos Multipart en los controladores y servicios.
* **Solución Implementada:** Se crearon interceptores de validación en la capa de servicio:
  * Restricción estricta de tamaño máximo (ej. 10 MB).
  * Validación del tipo de archivo (Content-Type) permitiendo únicamente archivos de tipo `.pdf`, `.docx`, `.xlsx`, `.png` y `.jpg`, rechazando cualquier ejecutable o script.

---

## 🎨 Historial de Issues del Frontend (React & Capacitor)

### 🐛 Issue #4: [BUG] Desbordamiento visual y desorden en la bandeja de justificaciones en dispositivos móviles
* **Gravedad:** Media-Alta (Impide la usabilidad en pantallas pequeñas).
* **Descripción:** Al abrir la pestaña de "Solicitudes de Justificación" en el panel del docente en un celular, la tabla HTML se desbordaba horizontalmente. El campo "Motivo de la falta" apretaba el texto de manera desordenada, haciendo que los botones de descargar evidencia y aprobar/rechazar fuesen inaccesibles.
* **Pasos para Reproducir:**
  1. Iniciar sesión como docente en un emulador móvil.
  2. Ir a Asistencia -> Solicitudes de Justificación.
  3. Observar la deformación visual de la tabla por falta de espacio responsivo.
* **Causa Raíz:** Uso exclusivo de un diseño basado en tablas HTML estándar (`<table>`), no óptimo para visualización móvil.
* **Solución Implementada:** Se rediseñó el componente en `Attendance.jsx`:
  * Se implementó un media-query o validación en JS detectando pantallas móviles (`window.innerWidth <= 768`).
  * En dispositivos móviles, la tabla se oculta y es reemplazada por un **diseño de tarjetas apiladas (Card Layout)** responsivo, estructurando el nombre del alumno, la fecha, el motivo y los botones de acción ordenados verticalmente.

---

### 🐛 Issue #5: [BUG] Desincronización de código React en el contenedor WebView de Android (Capacitor Cache)
* **Gravedad:** Alta (La app móvil no refleja los cambios o nuevas funciones subidas).
* **Descripción:** Al modificar las interfaces de justificación o materiales en React y ejecutar `npx cap sync`, el emulador o teléfono físico seguía mostrando la interfaz antigua del sistema.
* **Causa Raíz:** El compilador de Android Studio mantenía en caché recursos de compilaciones anteriores en la carpeta `assets/public` nativa.
* **Solución Implementada:** Se estableció una política estricta de limpieza de compilación para el flujo móvil:
  1. Ejecutar la compilación limpia de la web: `npm run build`.
  2. Sincronizar: `npm run cap:sync` o `npx cap sync`.
  3. En Android Studio, ir a la barra de menú: **Build -> Clean Project** y luego **Build -> Rebuild Project** antes de volver a correr la app en el dispositivo.

---

## 🚀 Cómo registrar estos Issues en tu GitHub (Paso a Paso)

Si deseas subir e implementar estos issues en el repositorio de GitHub de tu proyecto:

1. Ve a la página de tu repositorio en GitHub (ej. `https://github.com/EduMoralesCar/EduTrack-Frontend`).
2. Haz clic en la pestaña **"Issues"** en la barra superior.
3. Haz clic en el botón verde **"New Issue"** (Nueva incidencia).
4. Elige un título de la guía anterior (ej. `[BUG] Desbordamiento de la tabla de justificaciones en movil`).
5. Copia y pega el contenido (Descripción, Gravedad, Causa Raíz y Solución) en el cuadro de descripción.
6. En el panel lateral derecho:
   * En **Labels**, asigna etiquetas como `bug`, `frontend` o `high-priority`.
   * En **Assignees**, asígnate a ti mismo para indicar que estuviste a cargo de la resolución.
7. Haz clic en **"Submit new issue"** para guardarlo.
8. Una vez guardado, se le asignará un número único (ej. `#12`). 
9. **Consejo Profesional:** Al hacer tu commit de solución en Git, puedes agregar la palabra clave `closes #12` o `fixes #12` en tu mensaje de commit. Cuando se haga el merge a `main`, GitHub cerrará la incidencia automáticamente.
