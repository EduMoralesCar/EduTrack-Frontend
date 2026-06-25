<div align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
</div>

<h1 align="center">🎓 EduTrack - Cliente Frontend (Web & Móvil)</h1>

<p align="center">
  Interfaz de usuario moderna, interactiva y responsiva desarrollada en React (SPA) e integrada como app móvil mediante Capacitor.
</p>

<div align="center">
  <h3>
    <a href="https://edutrack-frontend-u0n5.onrender.com/">🚀 VER APLICACIÓN WEB EN VIVO (RENDER)</a>
  </h3>
</div>

---

## 🌟 Sobre el Proyecto

El cliente frontend de **EduTrack** es la interfaz visual responsiva y multiplataforma del sistema. Está diseñado como una Single Page Application (SPA) utilizando **React 18** y **Vite**, y empaquetado para dispositivos móviles (Android) mediante **Capacitor**. Adopta una línea estética moderna basada en **Glassmorphism** (transparencias, desenfoques de fondo y colores HSL balanceados) para ofrecer una experiencia de usuario premium (UI/UX).

---

## ✨ Mapeo Visual de Funcionalidades (Entregas Completas: Avance 1 - Avance 3)

La interfaz en React expone de manera interactiva los flujos académicos del sistema según el rol del usuario autenticado:

### 🔒 1. Seguridad y Acceso (Avance 1)
- **Login Premium (RF 02):** Formulario de acceso (`Login.jsx`) con tarjetas de autocompletado rápido para pruebas de roles. Mantiene sesión persistente con JWT en cabeceras locales.
- **Resiliencia de Red:** Interceptor de peticiones en `api.js` que redirige al login si se recibe un código `401 Unauthorized`.

### 👑 2. Panel Administrativo (Avance 1 & 2)
- **Gestión de Usuarios (RF 01):** Interfaz fluida (`Users.jsx`) con tablas del personal y alumnos, formularios modales y control de estados (Activo/Inactivo).
- **Catálogo de Cursos (RF 03):** Vista de tarjetas responsivas (`Courses.jsx`) con CRUD total para el rol Administrador y lectura general para docentes/estudiantes.
- **Secciones Académicas (RF 04 / RF 05):** Módulo de secciones (`Sections.jsx`) para dar de alta aulas virtuales y diálogos emergentes interactivos para vincular profesores autorizados a las materias vigentes.
- **Matrícula Activa (RF 04):** Panel interactivo (`Enrollments.jsx`) para dar de alta/baja estudiantes en las secciones escolares.

### 👨‍🏫 3. Módulo del Docente (Avance 3)
- **Planificación de Clases (RF 06):** Mapeo de 18 semanas de clase (`CourseContent.jsx`) con subida y edición rápida (lápiz ✏️) de materiales académicos y PDFs.
- **Evaluación Virtual (RF 06):** Programación y control de tareas y evaluaciones con campos configurables de intentos y fechas de entrega.
- **Registro de Notas (RF 08):** Matriz de calificaciones interactiva (`Grades.jsx`) con guardado inmediato al backend y visualización de promedios ponderados.
- **Control de Asistencia (RF 09):** Calendario de asistencia semanal interactivo (`Attendance.jsx`) con botones para registrar estados (Presente, Ausente, Tarde).
- **Resolución de Justificaciones (RF 10):** Bandeja premium con tablas de escritorio y **tarjetas apiladas responsivas (Card Layout)** en móviles para revisar detalles y resolver solicitudes de estudiantes.

### 👨‍🎓 4. Portal del Estudiante (Avance 3)
- **Carga de Trabajos (RF 07):** Formulario dinámico de subida de tareas con cálculo reactivo en base al límite de intentos y deshabilitación condicional.
- **Libreta Digital (RF 08):** Boleta digital desglosada por criterios ponderados oficiales de la UTP y estado final de aprobación.
- **Récord de Asistencias (RF 09):** Cronograma acumulado de asistencia de 18 semanas e indicador visual del porcentaje acumulado de faltas (alerta en rojo ante peligro de inhabilitación).
- **Justificaciones (RF 10):** Formulario interactivo y modal para justificar inasistencias en estado `AUSENTE` cargando comprobantes de sustento.

---

## 🔑 Credenciales de Acceso (Acceso Rápido)

Para simplificar las pruebas locales y de desarrollo, la pantalla de Login incluye tarjetas de acceso rápido que autocompletan las credenciales correspondientes a cada rol con un solo clic:

| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `JUAN PABLO` | `Admin123!` |
| **Docente** | `FERMIN LOPEZ` | `Docente123!` |
| **Estudiante** | `EDU MORALES` | `Estudiante123!` |

---

## 🛠️ Tecnologías Utilizadas

- **Librería de UI:** React 18+ (Vite)
- **Estilos (CSS):** Vanilla CSS con sistema de variables HSL y Glassmorphic Cards
- **Portabilidad Móvil:** Capacitor (Android Integration)
- **Consumo de API:** Fetch API con manejador asíncrono centralizado en `api.js`
- **Iconografía:** Lucide React

---

## 🚀 Despliegue Local (Para Desarrolladores)

Si deseas clonar el proyecto y correr la interfaz en tu máquina:

1. **Clonar el repositorio:**
```bash
git clone https://github.com/EduMoralesCar/EduTrack-Frontend.git
cd EduTrack-Frontend/Frontend
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Ejecutar el servidor de desarrollo local (Vite):**
```bash
npm run dev
```

4. **Sincronizar y probar en la Aplicación Móvil (Android):**
Asegúrate de tener instalado Android Studio y el SDK correspondiente. Luego ejecuta:
```powershell
# Copiar el bundle de producción de React a la carpeta de Android
npm run cap:sync

# Abrir el emulador/proyecto en Android Studio
npx cap open android
```
