<?php
// Conexión PDO a MySQL (XAMPP por defecto: usuario root sin contraseña).
// Si en tu máquina tenés otra contraseña, cambiala acá.
$host    = 'localhost';
$db      = 'nova_tech';
$user    = 'root';
$pass    = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false, // prepared statements reales del lado de MySQL
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["estado" => "error", "mensaje" => "Error de conexión con la base de datos."]);
    exit;
}
