# 🔐 Detalle de Endpoints, Roles y Seguridad Técnica

Este documento describe la arquitectura de seguridad implementada en la plataforma **EduTrack**, listando el total de endpoints disponibles en la API RESTful y especificando qué roles tienen permitido realizar peticiones en cada recurso.

---

## 🔒 Arquitectura de Seguridad Implementada

La seguridad de EduTrack se despliega bajo un enfoque moderno y desacoplado, estructurado en tres pilares principales:

### 1. Autenticación sin Estado (Stateless) mediante JWT
El backend no mantiene sesiones activas en memoria ni en base de datos. En su lugar, cuando un usuario inicia sesión en `POST /api/auth/login`, el servidor valida las credenciales y genera un **JSON Web Token (JWT)** firmado criptográficamente con una clave secreta.
* El frontend almacena este token de forma segura y lo añade en la cabecera de cada petición HTTP en el formato:
  `Authorization: Bearer <TOKEN>`

### 2. Control de Acceso Basado en Roles (RBAC) con Spring Security
Spring Security intercepta cada petición entrante en el backend. Extrae las credenciales y el rol del usuario desde el JWT y evalúa si cuenta con los privilegios requeridos. 
* Esto se gestiona mediante anotaciones anotadas directamente sobre los métodos en los controladores de Java:
  * `@PreAuthorize("hasRole('ADMIN')")`
  * `@PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")`
  * `@PreAuthorize("hasRole('STUDENT')")`
* Si el rol no cuenta con la autorización requerida, el servidor bloquea la petición automáticamente y retorna un código de error HTTP **`403 Forbidden`**.

### 3. Aislamiento mediante Patrón DTO (Data Transfer Objects)
Para evitar la fuga de datos confidenciales (como contraseñas encriptadas o datos de auditoría) y reducir la sobrecarga de red, el backend nunca expone las entidades JPA directo a la API. Toda comunicación bidireccional utiliza **DTOs**, los cuales filtran y adaptan exclusivamente la información requerida por la interfaz de usuario.

---

## 🧭 Matriz de Endpoints y Permisos por Rol

El sistema cuenta con un total de **29 endpoints** funcionales distribuidos en los siguientes módulos:

| Módulo | Endpoint HTTP | Acción | Rol ADMIN | Rol TEACHER | Rol STUDENT |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Autenticación** | `POST /api/auth/login` | Iniciar sesión y generar JWT | ✔️ (Público) | ✔️ (Público) | ✔️ (Público) |
| | `GET /api/auth/me` | Obtener perfil de sesión activo | ✔️ | ✔️ | ✔️ |
| **Usuarios** | `GET /api/users` | Listar todos los usuarios | ✔️ | ❌ | ❌ |
| | `GET /api/users/{id}` | Ver detalles de usuario por ID | ✔️ | ❌ | ❌ |
| | `POST /api/users` | Crear un nuevo usuario | ✔️ | ❌ | ❌ |
| | `PUT /api/users/{id}` | Actualizar datos de usuario | ✔️ | ❌ | ❌ |
| | `DELETE /api/users/{id}` | Dar de baja/Eliminar usuario | ✔️ | ❌ | ❌ |
| **Cursos** | `GET /api/courses` | Listar asignaturas disponibles | ✔️ | ✔️ | ✔️ |
| | `GET /api/courses/{id}` | Ver asignatura por ID | ✔️ | ✔️ | ✔️ |
| | `POST /api/courses` | Crear una nueva asignatura | ✔️ | ❌ | ❌ |
| | `PUT /api/courses/{id}` | Modificar datos de asignatura | ✔️ | ❌ | ❌ |
| | `DELETE /api/courses/{id}` | Eliminar asignatura del catálogo | ✔️ | ❌ | ❌ |
| **Secciones** | `GET /api/sections` | Listar secciones creadas | ✔️ | ✔️ | ❌ |
| | `GET /api/sections/{id}` | Ver sección por ID | ✔️ | ✔️ | ✔️ |
| | `GET /api/sections/course/{courseId}` | Listar secciones de un curso | ✔️ | ✔️ | ✔️ |
| | `POST /api/sections` | Crear una nueva sección académica | ✔️ | ❌ | ❌ |
| | `PUT /api/sections/{id}` | Modificar datos de sección | ✔️ | ❌ | ❌ |
| | `DELETE /api/sections/{id}` | Eliminar sección | ✔️ | ❌ | ❌ |
| | `PUT /api/sections/{sectionId}/teacher` | Asignar docente titular a sección | ✔️ | ❌ | ❌ |
| **Matrículas** | `POST /api/enrollments` | Matricular alumno en una sección | ✔️ | ❌ | ❌ |
| | `DELETE /api/enrollments/{id}` | Dar de baja matrícula de alumno | ✔️ | ❌ | ❌ |
| | `GET /api/enrollments/section/{sectionId}`| Listar padrón de matriculados | ✔️ | ✔️ | ❌ |
| | `GET /api/enrollments/my` | Listar cursos del alumno logueado | ❌ | ❌ | ✔️ |
| **Materiales** | `POST /api/materials` | Subir archivo de material de clase | ❌ | ✔️ | ❌ |
| | `PUT /api/materials/{id}` | Editar título o reemplazar archivo | ❌ | ✔️ | ❌ |
| | `DELETE /api/materials/{id}` | Eliminar material de clase | ❌ | ✔️ | ❌ |
| | `GET /api/materials/section/{sectionId}` | Listar materiales de la sección | ✔️ | ✔️ | ✔️ |
| | `PUT /api/materials/{id}/toggle-visibility` | Mostrar/Ocultar material a alumnos | ❌ | ✔️ | ❌ |
| **Evaluaciones**| `POST /api/assignments` | Programar una nueva evaluación | ❌ | ✔️ | ❌ |
| | `PUT /api/assignments/{id}` | Editar directrices de evaluación | ❌ | ✔️ | ❌ |
| | `GET /api/assignments/section/{id}` | Consultar evaluaciones programadas | ✔️ | ✔️ | ✔️ |
| | `POST /api/assignments/{id}/submit`| Subir entrega de tarea (Estudiante) | ❌ | ❌ | ✔️ |
| | `GET /api/assignments/section/{id}/submissions` | Ver lista de tareas entregadas | ❌ | ✔️ | ❌ |
| **Calificaciones**| `POST /api/grades` | Registrar o modificar nota de alumno | ❌ | ✔️ | ❌ |
| | `GET /api/grades/section/{sectionId}` | Obtener matriz completa de notas | ✔️ | ✔️ | ❌ |
| | `GET /api/grades/section/{sectionId}/final` | Obtener promedios ponderados UTP | ✔️ | ✔️ | ✔️ |
| **Asistencias** | `POST /api/attendance` | Registrar/Modificar asistencia diaria | ❌ | ✔️ | ❌ |
| | `GET /api/attendance/section/{id}` | Consultar récords de asistencia | ❌ | ✔️ | ✔️ |
| | `POST /api/attendance/{id}/justify` | Solicitar justificación por falta | ❌ | ❌ | ✔️ |
| | `GET /api/attendance/section/{id}/justifications` | Ver bandeja de solicitudes recibidas | ❌ | ✔️ | ❌ |
| | `PUT /api/attendance/justifications/{id}/resolve` | Aprobar o rechazar justificación | ❌ | ✔️ | ❌ |

---

## 🛠️ Códigos de Respuesta Estándar de la API

Cualquier endpoint listado anteriormente retornará de forma consistente los siguientes códigos de estado HTTP según el resultado de la petición:

* **`200 OK` / `201 Created`:** Petición exitosa. El recurso fue leído o creado correctamente.
* **`400 Bad Request`:** Petición mal formada o datos inválidos (ej. excede límite de intentos de entrega en tareas).
* **`401 Unauthorized`:** No se ha enviado token JWT en la cabecera, o el token enviado ha expirado.
* **`403 Forbidden`:** El usuario está autenticado, pero su rol no posee los permisos necesarios para acceder al recurso.
* **`404 Not Found`:** El recurso consultado (usuario, curso, sección, archivo) no existe en la base de datos.
* **`500 Internal Server Error`:** Fallo no controlado en el servidor backend (Render).
