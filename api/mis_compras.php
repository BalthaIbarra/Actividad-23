<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// ===== Guardián de sesión =====
// Si no hay usuario logueado cortamos acá con 401 y no se toca la base.
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401); // Unauthorized
    echo json_encode(["estado" => "error", "mensaje" => "Acceso no autorizado. Iniciá sesión."], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once '../config/conexion.php';

// El id SIEMPRE sale de la sesión, nunca del front,
// así nadie puede pedir las compras de otro usuario.
$usuarioId = $_SESSION['usuario_id'];

$usuario = [
    "nombre" => $_SESSION['usuario_nombre'],
    "email"  => $_SESSION['usuario_email']
];

// ===== GET: listado de compras del usuario logueado =====
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT c.id, c.fecha, c.medio_pago, c.total,
                       GROUP_CONCAT(CONCAT(d.cantidad, 'x ', p.nombre) SEPARATOR ', ') AS productos
                FROM compras c
                JOIN compra_detalle d ON d.compra_id = c.id
                JOIN productos p      ON p.id = d.producto_id
                WHERE c.usuario_id = :usuario_id
                GROUP BY c.id, c.fecha, c.medio_pago, c.total
                ORDER BY c.fecha DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['usuario_id' => $usuarioId]);

        http_response_code(200);
        echo json_encode([
            "estado"  => "exito",
            "usuario" => $usuario,
            "compras" => $stmt->fetchAll()
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["estado" => "error", "mensaje" => "No se pudieron obtener las compras."], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// ===== POST: registrar una compra nueva (desde comprar.html) =====
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input     = json_decode(file_get_contents('php://input'), true);
    $medioPago = $input['medio_pago'] ?? '';
    $items     = $input['items'] ?? [];

    $mediosValidos = ['tarjeta_credito', 'tarjeta_debito', 'transferencia', 'mercado_pago', 'efectivo'];
    if (!in_array($medioPago, $mediosValidos, true)) {
        http_response_code(400);
        echo json_encode(["estado" => "error", "mensaje" => "Elegí un medio de pago válido."], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Nos quedamos solo con los productos que tengan cantidad > 0
    $pedido = [];
    foreach ((array) $items as $item) {
        $productoId = $item['producto_id'] ?? '';
        $cantidad   = (int) ($item['cantidad'] ?? 0);
        if ($productoId !== '' && $cantidad > 0) {
            $pedido[$productoId] = ($pedido[$productoId] ?? 0) + $cantidad;
        }
    }

    if (empty($pedido)) {
        http_response_code(400);
        echo json_encode(["estado" => "error", "mensaje" => "El pedido no tiene productos."], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Los precios los sacamos de la base y no del front
        // (si no, cualquiera podría mandarse un auricular a $1).
        $stmtProducto = $pdo->prepare('SELECT id, nombre, precio, stock FROM productos WHERE id = :id FOR UPDATE');
        $detalle = [];
        $total   = 0;

        foreach ($pedido as $productoId => $cantidad) {
            $stmtProducto->execute(['id' => $productoId]);
            $producto = $stmtProducto->fetch();

            if (!$producto) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(["estado" => "error", "mensaje" => "Hay un producto que no existe en el catálogo."], JSON_UNESCAPED_UNICODE);
                exit;
            }
            if ($producto['stock'] < $cantidad) {
                $pdo->rollBack();
                http_response_code(409);
                echo json_encode(["estado" => "error", "mensaje" => "No hay stock suficiente de " . $producto['nombre'] . "."], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $subtotal = $producto['precio'] * $cantidad;
            $total   += $subtotal;
            $detalle[] = [
                "producto_id" => $producto['id'],
                "nombre"      => $producto['nombre'],
                "cantidad"    => $cantidad,
                "precio"      => $producto['precio'],
                "subtotal"    => $subtotal
            ];
        }

        $stmtCompra = $pdo->prepare('INSERT INTO compras (usuario_id, medio_pago, total) VALUES (:usuario_id, :medio_pago, :total)');
        $stmtCompra->execute([
            'usuario_id' => $usuarioId,
            'medio_pago' => $medioPago,
            'total'      => $total
        ]);
        $compraId = (int) $pdo->lastInsertId();

        $stmtDetalle = $pdo->prepare('INSERT INTO compra_detalle (compra_id, producto_id, cantidad, precio_unitario)
                                      VALUES (:compra_id, :producto_id, :cantidad, :precio)');
        $stmtStock   = $pdo->prepare('UPDATE productos SET stock = stock - :cantidad WHERE id = :id');

        foreach ($detalle as $linea) {
            $stmtDetalle->execute([
                'compra_id'   => $compraId,
                'producto_id' => $linea['producto_id'],
                'cantidad'    => $linea['cantidad'],
                'precio'      => $linea['precio']
            ]);
            $stmtStock->execute(['cantidad' => $linea['cantidad'], 'id' => $linea['producto_id']]);
        }

        $pdo->commit();

        http_response_code(201);
        echo json_encode([
            "estado"  => "exito",
            "mensaje" => "Compra registrada.",
            "compra"  => [
                "id"         => $compraId,
                "cliente"    => $usuario['nombre'],
                "medio_pago" => $medioPago,
                "total"      => $total,
                "detalle"    => $detalle
            ]
        ], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(["estado" => "error", "mensaje" => "No se pudo registrar la compra."], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

http_response_code(405);
echo json_encode(["estado" => "error", "mensaje" => "Método no permitido."], JSON_UNESCAPED_UNICODE);
