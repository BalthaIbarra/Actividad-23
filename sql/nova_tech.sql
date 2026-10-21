-- Nova Tech - Actividad 23

CREATE DATABASE IF NOT EXISTS nova_tech
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nova_tech;

-- Clientes de la tienda
-- password VARCHAR(255) para el hash BCRYPT
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  rol        ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Productos (mismo id que en data/productos.json)
CREATE TABLE IF NOT EXISTS productos (
  id      VARCHAR(40) PRIMARY KEY,
  nombre  VARCHAR(150) NOT NULL,
  precio  DECIMAL(10,2) NOT NULL,
  stock   INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- Compras y su detalle
CREATE TABLE IF NOT EXISTS compras (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  medio_pago  VARCHAR(30) NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_compras_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compra_detalle (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  compra_id        INT NOT NULL,
  producto_id      VARCHAR(40) NOT NULL,
  cantidad         INT NOT NULL,
  precio_unitario  DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_detalle_compra FOREIGN KEY (compra_id)
    REFERENCES compras(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos(id)
) ENGINE=InnoDB;

-- Datos de prueba
INSERT IGNORE INTO productos (id, nombre, precio, stock) VALUES
  ('novasound-x1',   'Auriculares Bluetooth NovaSound X1',   45999.00, 25),
  ('novacharge-65w', 'Cargador Rápido GaN NovaCharge 65W',   18500.00, 40),
  ('novakey-rgb',    'Teclado Mecánico NovaKey RGB',         52000.00, 15),
  ('novaclick-pro',  'Mouse Inalámbrico NovaClick Pro',      22300.00, 30),
  ('novaboom-mini',  'Parlante Portátil NovaBoom Mini',      31200.00, 18),
  ('novacharge-20k', 'Power Bank NovaCharge 20000mAh',       27800.00,  8),
  ('novabuds-air',   'Auriculares In-Ear NovaBuds Air',      28900.00, 35),
  ('novahub-7',      'Hub USB-C NovaHub 7-en-1',             19900.00, 12);

-- usuario demo (demo@novatech.com)
INSERT IGNORE INTO usuarios (id, nombre, email, password) VALUES
  (1, 'Usuario Demo', 'demo@novatech.com', '$2y$10$0FsStC2rRM/0g43oIlYeEeqslI9XW7Rdw3BtpPfk2ngtAHTnS0Hfm');

-- compra de ejemplo
INSERT IGNORE INTO compras (id, usuario_id, fecha, medio_pago, total) VALUES
  (1, 1, '2026-09-04 18:30:00', 'tarjeta_credito', 45999.00);

INSERT IGNORE INTO compra_detalle (id, compra_id, producto_id, cantidad, precio_unitario) VALUES
  (1, 1, 'novasound-x1', 1, 45999.00);
