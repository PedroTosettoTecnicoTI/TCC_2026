<?php
// api/auth.php - Authentication endpoints
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once '../config/database.php';
require_once '../models/User.php';

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

$method = $_SERVER['REQUEST_METHOD'];

if($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    // Login
    if(isset($data->action) && $data->action === 'login') {
        $user->username = $data->username;
        $user->password = $data->password;
        
        $result = $user->login();
        if($result) {
            $_SESSION['user_id'] = $result['id'];
            $_SESSION['username'] = $result['username'];
            $_SESSION['role'] = $result['role'];
            
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $result['id'],
                    'username' => $result['username'],
                    'role' => $result['role']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        }
    }
    
    // Logout
    elseif(isset($data->action) && $data->action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true]);
    }
}

if($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'check') {
    if(isset($_SESSION['user_id'])) {
        echo json_encode([
            'logged_in' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'role' => $_SESSION['role']
            ]
        ]);
    } else {
        echo json_encode(['logged_in' => false]);
    }
}
?>