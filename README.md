<div align="center">
  
# 🎓 EduTrack - Frontend Web Client
### Cliente React SPA - Entrega Actual (RF & RNF)

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

</div>

---

## 📋 Mapeo Visual de Requerimientos Funcionales (RF)

La interfaz en React expone de manera interactiva los flujos académicos del sistema según el rol del usuario logueado:

*   **RF01 - Gestión de Usuarios (ADMIN):**
    *   *Componente:* [Users.jsx](file:///d:/Workspace/utp/EduTrack/Frontend/src/components/Users.jsx)
    *   *Visual:* Panel interactivo con tablas de personal y alumnos, formularios modales y estados dinámicos (Activo/Inactivo).
*   **RF02 - Autenticación y Sesión (TODOS):**
    *   *Componentes:* [Login.jsx](file:///d:/Workspace/utp/EduTrack/Frontend/src/components/Login.jsx) y [App.jsx](file:///d:/Workspace/utp/EduTrack/Frontend/src/App.jsx)
    *   *Visual:* Formulario de acceso premium con tarjetas de autocompletado rápido para pruebas de roles. Mantiene sesión persistente con JWT en cabeceras locales.
*   **RF03 - Catálogo de Cursos (TODOS):**
    *   *Componente:* [Courses.jsx](file:///d:/Workspace/utp/EduTrack/Frontend/src/components/Courses.jsx)
    *   *Visual:* Vista adaptativa de tarjetas. Habilita CRUD total para el rol `ADMIN` y restringe a modo lectura descriptiva para `TEACHER` y `STUDENT`.
*   **RF04 - Secciones y Matrícula Estudiantil (ADMIN / TEACHER):**
    *   *Componente:* [Enrollments.jsx](file:///d:/Workspace/utp/EduTrack/Frontend/src/components/Enrollments.jsx)
    *   *Visual:* Selector superior de secciones. Permite al `ADMIN` dar de alta/baja estudiantes, y brinda al `TEACHER` la visualización rápida de la lista y conteo de alumnos asignados a su aula.
*   **RF05 - Asignación Docente (ADMIN):**
    *   *Componente:* [Sections.jsx](file:///d:/Workspace/utp/EduTrack/Frontend/src/components/Sections.jsx)
    *   *Visual:* Vista modular de secciones. Incluye diálogos emergentes interactivos para vincular profesores autorizados a las materias vigentes en el periodo escolar.

---

## ✨ Requerimientos No Funcionales del Cliente (RNF)

*   **RNF - Interfaz de Usuario Premium (UI/UX):**
    *   Diseño moderno enfocado en **Glassmorphism** (bordes translúcidos y desenfoques mediante `backdrop-filter: blur(16px)`) con colores coordinados en HSL (violeta, esmeralda y oscuro profundo) y fuentes legibles (*Outfit* y *Plus Jakarta Sans*).
*   **RNF - Resiliencia de Sesión y Red:**
    *   Módulo [api.js](file:///d:/Workspace/utp/EduTrack/Frontend/src/services/api.js) centralizado. Intercepta respuestas HTTP y gatilla cierres de sesión controlados ante códigos `401 Unauthorized`.
*   **RNF - Rendimiento y Tiempos de Carga:**
    *   Estructurado con Vite para garantizar compilaciones rápidas (HMR) y un renderizado del DOM en milisegundos.

---

## 🚀 Instalación y Pruebas Clínicas

1.  **Instalar y Levantar:**
    ```bash
    npm install
    npm run dev
    ```
2.  **Verificación Local:**
    *   Acceso: [http://localhost:5173](http://localhost:5173)
3.  **Acceso de Demostración con 1 Clic:**
    *   En el Login, haz clic sobre cualquiera de las tarjetas de la sección inferior para ingresar inmediatamente como **Admin**, **Docente** o **Estudiante** y testear la lógica de roles de forma instantánea.
