<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["estado" => "error", "mensaje" => "Método no permitido."], JSON_UNESCAPED_UNICODE);
    exit;
}

$input    = json_decode(file_get_contents('php://input'), true);
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "Ingresá tu email y contraseña."], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, nombre, email, password, rol FROM usuarios WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $usuario = $stmt->fetch();

    // password_verify compara la clave escrita contra el hash guardado.
    // Si el email no existe o la clave no coincide damos el mismo mensaje,
    // así no se puede averiguar qué emails están registrados.
    if ($usuario && password_verify($password, $usuario['password'])) {
        session_start();
        // Regeneramos el id de sesión para evitar session fixation
        session_regenerate_id(true);

        $_SESSION['usuario_id']     = $usuario['id'];
        $_SESSION['usuario_nombre'] = $usuario['nombre'];
        $_SESSION['usuario_email']  = $usuario['email'];
        $_SESSION['usuario_rol']    = $usuario['rol'];

        http_response_code(200);
        echo json_encode([
            "estado"  => "exito",
            "mensaje" => "Sesión iniciada.",
            "usuario" => [
                "nombre" => $usuario['nombre'],
                "email"  => $usuario['email']
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode(["estado" => "error", "mensaje" => "Email o contraseña incorrectos."], JSON_UNESCAPED_UNICODE);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["estado" => "error", "mensaje" => "Error interno del servidor."], JSON_UNESCAPED_UNICODE);
}
