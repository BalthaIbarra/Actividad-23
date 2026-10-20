<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["estado" => "error", "mensaje" => "Método no permitido."]);
    exit;
}

// El front manda los datos como JSON, así que leemos el body crudo
$input = json_decode(file_get_contents('php://input'), true);

// Nota: el nombre lo guardamos tal cual lo escribió el usuario.
// La protección contra XSS la hacemos al mostrarlo (textContent en app.js),
// si lo escapáramos acá con htmlspecialchars se vería "&amp;" en pantalla.
$nombre   = trim($input['nombre'] ?? '');
$email    = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($nombre) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "Todos los campos son obligatorios."], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "El email no tiene un formato válido."], JSON_UNESCAPED_UNICODE);
    exit;
}

// Misma regla que en el front (LONGITUD_MINIMA_CLAVE), pero validada también acá
// porque el front se puede saltear mandando el fetch a mano.
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "La contraseña debe tener al menos 8 caracteres."], JSON_UNESCAPED_UNICODE);
    exit;
}

if (mb_strlen($nombre) > 100) {
    http_response_code(400);
    echo json_encode(["estado" => "error", "mensaje" => "El nombre es demasiado largo."], JSON_UNESCAPED_UNICODE);
    exit;
}

// Hash BCRYPT: nunca guardamos la contraseña en texto plano
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

try {
    $sql  = "INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :pass)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'nombre' => $nombre,
        'email'  => $email,
        'pass'   => $passwordHash
    ]);

    http_response_code(201); // Created
    echo json_encode(["estado" => "exito", "mensaje" => "Cuenta creada correctamente."], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        // 23000 = violación de UNIQUE (el email ya está registrado)
        http_response_code(409);
        echo json_encode(["estado" => "error", "mensaje" => "Ya existe una cuenta registrada con ese email."], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode(["estado" => "error", "mensaje" => "Error interno al registrar el usuario."], JSON_UNESCAPED_UNICODE);
    }
}
