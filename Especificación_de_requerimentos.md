# Documento de Especificación de Requisitos y Diseño de Base de Datos
**Proyecto:** Sistema de Gestión de Base de Datos  
**Estado:** Plantilla de Especificación  
**Versión:** 1.0  

---

## 1. Análisis de Requisitos

El objetivo de esta fase es comprender el dominio del problema, interactuar con los stakeholders y definir el alcance de la información que el sistema debe gestionar.

### 1.1. Entrevistas con Usuarios
* Planificación y ejecución de reuniones con los futuros usuarios del sistema (administradores, clientes, personal operativo).
* Registro de necesidades individuales, problemas actuales con sistemas existentes y expectativas del nuevo desarrollo.

### 1.2. Identificación de Datos a Almacenar
* Determinación de los objetos del mundo real (entidades) y sus características (atributos) que son críticos para el negocio.
* Clasificación de datos en estáticos (configuraciones, catálogos) y dinámicos (transacciones, registros de actividad).

### 1.3. Control de Acceso y Roles
Definición de la matriz de permisos para garantizar la seguridad e integridad de la información:
* **Lectura (Select):** Quién puede visualizar la información.
* **Escritura (Insert, Update, Delete):** Quién puede introducir, modificar o eliminar registros.
* **Roles Tipificados:** Administrador, Gestor, Usuario Técnico, Cliente, etc.

### 1.4. Reglas de Negocio
* Documentación de las restricciones lógicas y operativas que rigen el comportamiento de los datos.
* *Ejemplos:* "Un cliente no puede realizar un pedido si tiene facturas vencidas", "El stock de un producto no puede ser inferior a cero".

---

## 2. Diseño Conceptual

Traducción de los requisitos abstractos en un modelo visual independiente de la tecnología que se utilizará para la implementación.

### 2.1. Diagrama Entidad-Relación (ER)
* Representación gráfica del esquema de la base de datos utilizando la notación estándar.

### 2.2. Entidades, Atributos y Relaciones
* **Entidades:** Objetos o conceptos clave (ej. *Usuario*, *Producto*, *Factura*).
* **Atributos:** Propiedades que describen a las entidades (ej. *Nombre*, *Precio*, *Fecha*).
* **Relaciones:** Conexiones y asociaciones lógicas entre las entidades (ej. Un *Usuario* realiza una *Factura*).

### 2.3. Cardinalidades
Definición de los límites de participación en las relaciones:
* **1:1 (Uno a Uno):** Cada registro de la Entidad A se relaciona con un único registro de la Entidad B.
* **1:N (Uno a Muchos):** Un registro de la Entidad A puede relacionarse con múltiples registros de la Entidad B.
* **N:M (Muchos a Muchos):** Múltiples registros de la Entidad A pueden relacionarse con múltiples registros de la Entidad B (requiere tabla intermedia en fases posteriores).

---

## 3. Diseño Lógico

Adaptación del modelo conceptual al modelo relacional, estructurando los datos en un formato de tablas óptimo.

### 3.1. Transformación del Modelo ER a Tablas y Columns
* Conversión de entidades en tablas físicas.
* Conversión de atributos en columnas con sus respectivas restricciones iniciales.
* Resolución de relaciones N:M mediante la creación de tablas asociativas.

### 3.2. Proceso de Normalización
Aplicación de reglas algebraicas para asegurar una estructura eficiente y libre de anomalías:
* **Primera Forma Normal (1FN):** Eliminación de grupos repetidos y asegurar que los valores de las columnas sean atómicos.
* **Segunda Forma Normal (2FN):** Cumplir la 1FN y asegurar que todos los atributos de no-clave dependan de toda la clave primaria.
* **Tercera Forma Normal (3FN):** Cumplir la 2FN y asegurar que no existan dependencias transitivas (atributos que dependan de otros atributos que no son clave).

### 3.3. Definición de Claves Primarias y Foráneas
* **Claves Primarias (PK):** Identificadores únicos para cada fila de una tabla.
* **Claves Foráneas (FK):** Establecimiento de vínculos de integridad entre tablas, apuntando a la PK de la tabla origen.

### 3.4. Eliminación de Redundancias
* Optimización del espacio de almacenamiento y prevención de inconsistencias durante las operaciones de actualización de datos.

---

## 4. Diseño Físico

Configuración del entorno técnico real donde residirá la base de datos.

### 4.1. Elección del Motor de Base de Datos (SGBD)
Evaluación y selección de la tecnología adecuada según los requisitos de concurrencia, volumen y presupuesto:
* **PostgreSQL:** Para sistemas empresariales complejos que requieran alta transaccionalidad y soporte robusto.
* **MySQL:** Para aplicaciones web estándar con alta velocidad de lectura.
* **SQLite:** Para prototipos, aplicaciones móviles o sistemas embebidos de un solo usuario.

### 4.2. Definición de Tipos de Datos Concretos
Asignación del tipo específico optimizado para cada columna en el motor elegido:
* Cadenas de texto: `VARCHAR(n)`, `TEXT`.
* Numéricos: `INT`, `BIGINT`, `DECIMAL(p,s)`.
* Temporales: `DATE`, `TIMESTAMP`.

---

## 5. Implementation

Fase de codificación y construcción del entorno de datos.

### 5.1. Scripts de Estructura (CREATE TABLE)
* Escritura del código SQL DDL (*Data Definition Language*) para generar las tablas, aplicar restricciones de clave (`PRIMARY KEY`, `FOREIGN KEY`) y de integridad (`NOT NULL`, `UNIQUE`, `CHECK`).

### 5.2. Carga de Datos Iniciales (Seeders)
* Inserción de datos maestros obligatorios para el funcionamiento inicial del sistema (provincias, roles, configuraciones base).

### 5.3. Objetos de Base de Datos Avanzados
* **Vistas:** Consultas predefinidas para simplificar el acceso a datos complejos.
* **Procedimientos Almacenados y Funciones:** Código ejecutable en el servidor para automatizar procesos repetitivos.
* **Restricciones (Triggers / Disparadores):** Automatismos para validar reglas de negocio complejas antes de insertar o modificar datos.

---

## 6. Validación y Pruebas

Garantía de calidad para certificar que el sistema cumple con lo especificado en la fase de análisis.

### 6.1. Comprobación de Consultas Principales
* Ejecución de pruebas de rendimiento y exactitud en las consultas críticas (*Queries*) requeridas por la aplicación cliente.

### 6.2. Verificación de Integridad Referencial
* Validación de que las reglas de borrado y actualización en cascada (`ON DELETE`, `ON UPDATE`) funcionan correctamente y que no es posible dejar datos huérfanos.

### 6.3. Pruebas con Datos Reales o Simulados
* Pruebas de estrés y volumen utilizando conjuntos de datos ficticios a gran escala para evaluar la velocidad de respuesta y el comportamiento de los índices.