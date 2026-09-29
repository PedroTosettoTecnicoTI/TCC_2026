<?php
// api/users.php - User management endpoints (admin only)
session_start();
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once '../config/database.php';
require_once '../models/User.php';

// Check authentication and admin role
if(!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit();
}

$database = new Database();
$db = $database->getConnection();
$user = new User($db);

$method = $_SERVER['REQUEST_METHOD'];

if($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    // Create user
    if(isset($data->action) && $data->action === 'create') {
        $user->username = $data->username;
        $user->password = $data->password;
        $user->role = $data->role;
        
        if($user->create()) {
            echo json_encode(['success' => true, 'message' => 'User created successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to create user']);
        }
    }
    
    // Update user
    elseif(isset($data->action) && $data->action === 'update') {
        $user->id = $data->id;
        $user->role = $data->role;
        if(isset($data->password) && !empty($data->password)) {
            $user->password = $data->password;
        }
        
        if($user->update()) {
            echo json_encode(['success' => true, 'message' => 'User updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update user']);
        }
    }
}

if($method === 'GET') {
    // Get all users
    if(isset($_GET['action']) && $_GET['action'] === 'getAll') {
        $users = $user->getAll();
        echo json_encode(['success' => true, 'data' => $users]);
    }
}

if($method === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"));
    
    if(isset($data->id)) {
        $user->id = $data->id;
        if($user->delete()) {
            echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete user']);
        }
    }
}
?>